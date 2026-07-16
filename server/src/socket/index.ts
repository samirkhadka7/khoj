import type { Server as HttpServer } from 'http'
import { Server, type Socket } from 'socket.io'
import { Message } from '../models'
import { verifyToken } from '../utils/jwt'
import { authorizeChat } from '../utils/chatAuth'
import type { UserRole } from '../types'

/* -------------------------------------------------------------------------- */
/*  Event payload types                                                        */
/* -------------------------------------------------------------------------- */

interface SocketData {
  userId: string
  role: UserRole
}

type Ack = (response: { ok: true } | { ok: false; error: string }) => void

interface ChatMessagePayload {
  _id: string
  contactRequestId: string
  senderId: string
  receiverId: string
  content: string
  read: boolean
  createdAt: string
}

interface ClientToServerEvents {
  'chat:join': (payload: { contactRequestId: string }, ack?: Ack) => void
  'chat:leave': (payload: { contactRequestId: string }) => void
  'chat:send': (
    payload: { contactRequestId: string; content: string },
    ack?: Ack
  ) => void
  'chat:typing': (payload: { contactRequestId: string; typing: boolean }) => void
  'chat:read': (payload: { contactRequestId: string }) => void
}

interface ServerToClientEvents {
  'chat:message': (msg: ChatMessagePayload) => void
  'chat:typing': (data: { userId: string; typing: boolean }) => void
  'chat:read': (data: { userId: string; readAt: string }) => void
}

type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>

/* -------------------------------------------------------------------------- */
/*  initSocket — called once from server.ts after the HTTP server is created  */
/* -------------------------------------------------------------------------- */

export const initSocket = (httpServer: HttpServer): Server => {
  // Same multi-origin parsing as Express CORS — keep them in sync so a browser
  // request that passes one but not the other doesn't silently fail.
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS ||
    process.env.FRONTEND_URL ||
    'http://localhost:3000'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

  const isDev = process.env.NODE_ENV !== 'production'

  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
  >(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (!origin) return cb(null, true)
        if (allowedOrigins.includes(origin)) return cb(null, true)
        // Dev: allow any localhost port (Next.js bumps 3000 → 3001 when busy)
        if (isDev && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return cb(null, true)
        }
        cb(new Error(`CORS (socket): origin not allowed (${origin})`))
      },
      credentials: true,
    },
  })

  /* ---- 1. JWT handshake middleware ----
     Runs once per connection. The client sends the token via:
       const socket = io('http://...', { auth: { token: '<JWT>' } })
     Connection is rejected if token is missing or invalid.
  */
  io.use((socket, next) => {
    const tokenFromAuth = (socket.handshake.auth as { token?: string } | undefined)?.token
    const tokenFromHeader = socket.handshake.headers.authorization?.replace(/^Bearer /, '')
    const token = tokenFromAuth || tokenFromHeader

    if (!token) {
      next(new Error('Authentication required'))
      return
    }

    try {
      const payload = verifyToken(token)
      socket.data.userId = payload.userId
      socket.data.role = payload.role
      next()
    } catch {
      next(new Error('Invalid or expired token'))
    }
  })

  /* ---- 2. Connection handler ---- */
  io.on('connection', (socket: AppSocket) => {
    const { userId } = socket.data
    console.log(`[Socket] connected user=${userId} sid=${socket.id}`)

    // ----- chat:join -----
    socket.on('chat:join', async ({ contactRequestId }, ack) => {
      const request = await authorizeChat(contactRequestId, userId)
      if (!request) {
        ack?.({ ok: false, error: 'Chat is locked or you are not a participant' })
        return
      }
      socket.join(contactRequestId)
      ack?.({ ok: true })
    })

    // ----- chat:leave -----
    socket.on('chat:leave', ({ contactRequestId }) => {
      socket.leave(contactRequestId)
    })

    // ----- chat:send -----
    socket.on('chat:send', async ({ contactRequestId, content }, ack) => {
      if (typeof content !== 'string') {
        ack?.({ ok: false, error: 'Invalid message content' })
        return
      }
      const trimmed = content.trim()
      if (trimmed.length === 0) {
        ack?.({ ok: false, error: 'Message cannot be empty' })
        return
      }
      if (trimmed.length > 2000) {
        ack?.({ ok: false, error: 'Message too long (max 2000 chars)' })
        return
      }

      // Re-check authorization on EVERY send — request status could have flipped
      // (e.g. owner unaccepted, admin rolled it back) since the user joined the room
      const request = await authorizeChat(contactRequestId, userId)
      if (!request) {
        ack?.({ ok: false, error: 'Chat is no longer available' })
        return
      }

      // Receiver = whichever party is NOT the sender
      const tenantId = request.tenantId.toString()
      const ownerId = request.ownerId.toString()
      const receiverId = userId === tenantId ? ownerId : tenantId

      const msg = await Message.create({
        contactRequestId: request._id,
        senderId: userId,
        receiverId,
        content: trimmed,
        read: false,
      })

      const payload: ChatMessagePayload = {
        _id: msg._id.toString(),
        contactRequestId: msg.contactRequestId.toString(),
        senderId: msg.senderId.toString(),
        receiverId: msg.receiverId.toString(),
        content: msg.content,
        read: msg.read,
        createdAt: msg.createdAt.toISOString(),
      }

      // Broadcast to the room — both parties (and any extra tabs) get it instantly
      io.to(contactRequestId).emit('chat:message', payload)
      ack?.({ ok: true })
    })

    // ----- chat:typing (no DB hit — pure transient signal) -----
    socket.on('chat:typing', ({ contactRequestId, typing }) => {
      // Only honor typing events from sockets that already joined the room.
      // This is a cheap defense without re-running authorizeChat on every keystroke.
      if (!socket.rooms.has(contactRequestId)) return
      // socket.to(...) excludes the sender — they don't need their own typing event
      socket.to(contactRequestId).emit('chat:typing', { userId, typing: !!typing })
    })

    // ----- chat:read (read receipts) -----
    socket.on('chat:read', async ({ contactRequestId }) => {
      const request = await authorizeChat(contactRequestId, userId)
      if (!request) return
      // Mark as read every message addressed to me in this conversation
      await Message.updateMany(
        { contactRequestId: request._id, receiverId: userId, read: false },
        { $set: { read: true } }
      )
      // Tell the other side their messages were seen — they can update tick marks
      socket.to(contactRequestId).emit('chat:read', {
        userId,
        readAt: new Date().toISOString(),
      })
    })

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] disconnected user=${userId} sid=${socket.id} reason=${reason}`)
    })
  })

  return io
}
