'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { io, type Socket } from 'socket.io-client'
import { Loader2, Lock } from 'lucide-react'
import toast from 'react-hot-toast'

import api, { getAccessToken } from '@/lib/axios'
import { useDashboardUser } from '@/components/dashboard/DashboardContext'
import { ChatHeader } from '@/components/messages/ChatHeader'
import { MessageList } from '@/components/messages/MessageList'
import { MessageInput } from '@/components/messages/MessageInput'
import type { ChatAck, ChatMessage } from '@/components/messages/types'
import type { ApiResponse, ContactRequest, Listing, User } from '@/types'

// Socket.io connects DIRECTLY to the backend (not through the /api proxy) — it
// authenticates with the Bearer access token, so it doesn't need the cookie.
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5050'

/**
 * Single chat thread.
 *
 * Lifecycle:
 *   1. Fetch contact-request meta (other party + listing) + REST history
 *   2. Connect socket with JWT in handshake.auth.token
 *   3. Emit chat:join — server validates status==='accepted' AND user is participant
 *   4. Listen for chat:message / chat:typing / chat:read
 *   5. On unmount, leave room and disconnect
 */
export default function ChatThreadPage() {
  const params = useParams<{ id: string }>()
  const contactRequestId = params.id
  const { user } = useDashboardUser()

  const [request, setRequest] = useState<ContactRequest | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [accessError, setAccessError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)
  const [connected, setConnected] = useState(false)

  const socketRef = useRef<Socket | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const otherTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTypingEmitRef = useRef<number>(0)

  /* ---- 1. Fetch meta + history in parallel ---- */
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [historyRes, sentRes, receivedRes] = await Promise.all([
          api.get<ApiResponse<ChatMessage[]>>(`/api/messages/${contactRequestId}?limit=100`),
          api.get<ApiResponse<ContactRequest[]>>('/api/contact-request/sent?status=accepted'),
          api.get<ApiResponse<ContactRequest[]>>('/api/contact-request/received?status=accepted'),
        ])
        if (cancelled) return

        if (historyRes.data.success && historyRes.data.data) {
          setMessages(historyRes.data.data)
        }

        const all = [...(sentRes.data.data ?? []), ...(receivedRes.data.data ?? [])]
        const found = all.find((r) => r._id === contactRequestId)
        if (!found) {
          setAccessError('This conversation is locked or you are not a participant.')
          return
        }
        setRequest(found)

        // Mark all unread (to me) as read — REST fallback for clients with no socket yet
        await api.patch(`/api/messages/${contactRequestId}/read`).catch(() => {})
      } catch (err: unknown) {
        if (cancelled) return
        const e = err as { response?: { status?: number; data?: { message?: string } } }
        if (e.response?.status === 403) {
          setAccessError(e.response.data?.message || 'Access denied')
        } else {
          toast.error(e.response?.data?.message || 'Could not load chat')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [contactRequestId])

  /* ---- 2. Socket lifecycle (only after access is known to be OK) ---- */
  useEffect(() => {
    if (loading || accessError || !request) return

    const token = getAccessToken()
    if (!token) return

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('chat:join', { contactRequestId }, (ack: ChatAck) => {
        if (!ack.ok) {
          toast.error(ack.error || 'Could not join chat')
          setAccessError(ack.error || 'Access denied')
        }
      })
      // Mark backlog read on the server side too — both REST and socket converge
      socket.emit('chat:read', { contactRequestId })
    })

    socket.on('disconnect', () => setConnected(false))

    socket.on('connect_error', (err: Error) => {
      toast.error(err.message || 'Connection error')
      setConnected(false)
    })

    socket.on('chat:message', (msg: ChatMessage) => {
      setMessages((prev) => {
        // Avoid duplicates if our optimistic insert and the server broadcast race
        if (prev.some((m) => m._id === msg._id)) return prev
        return [...prev, msg]
      })
      // Live message addressed to me → fire chat:read so they see double-check
      if (msg.receiverId === user._id) {
        socket.emit('chat:read', { contactRequestId })
      }
    })

    socket.on('chat:typing', (data: { userId: string; typing: boolean }) => {
      if (data.userId === user._id) return
      setOtherTyping(data.typing)
      if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current)
      if (data.typing) {
        // Safety net — clear if we never get a "typing: false"
        otherTypingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 4000)
      }
    })

    socket.on('chat:read', () => {
      setMessages((prev) =>
        prev.map((m) => (m.senderId === user._id ? { ...m, read: true } : m))
      )
    })

    return () => {
      socket.emit('chat:leave', { contactRequestId })
      socket.disconnect()
      socketRef.current = null
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current)
    }
  }, [loading, accessError, request, contactRequestId, user._id])

  /* ---- 3. Auto-scroll on new messages or typing ---- */
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length, otherTyping])

  /* ---- Derived: other party + listing ---- */
  const { other, listing, isViewerTenant } = useMemo(() => {
    if (!request)
      return {
        other: null as User | null,
        listing: null as Listing | null,
        isViewerTenant: false,
      }
    const tenantId =
      typeof request.tenantId === 'object' ? request.tenantId._id : request.tenantId
    const tenantObj = typeof request.tenantId === 'object' ? (request.tenantId as User) : null
    const ownerObj = typeof request.ownerId === 'object' ? (request.ownerId as User) : null
    const viewerIsTenant = tenantId === user._id
    return {
      other: viewerIsTenant ? ownerObj : tenantObj,
      listing: typeof request.listingId === 'object' ? (request.listingId as Listing) : null,
      isViewerTenant: viewerIsTenant,
    }
  }, [request, user._id])

  /* ---- Send / typing ---- */
  const send = () => {
    const content = draft.trim()
    if (!content || !socketRef.current || sending) return
    setSending(true)
    socketRef.current.emit(
      'chat:send',
      { contactRequestId, content },
      (ack: ChatAck) => {
        setSending(false)
        if (!ack.ok) {
          toast.error(ack.error || 'Could not send message')
          return
        }
        setDraft('')
      }
    )
  }

  const onDraftChange = (val: string) => {
    setDraft(val)
    if (!socketRef.current) return
    // Throttle outbound typing emits to once every 1.5s
    const now = Date.now()
    if (now - lastTypingEmitRef.current > 1500) {
      lastTypingEmitRef.current = now
      socketRef.current.emit('chat:typing', { contactRequestId, typing: true })
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('chat:typing', { contactRequestId, typing: false })
    }, 2000)
  }

  /* ---- Render ---- */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="text-gray-400 animate-spin" />
      </div>
    )
  }

  if (accessError) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="bg-white border border-gray-100 rounded-lg p-10 text-center max-w-[440px] mx-auto shadow-card">
          <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
            <Lock size={20} />
          </div>
          <h1 className="font-display font-bold text-[18px] text-gray-800 mb-2">
            Chat unavailable
          </h1>
          <p className="text-[13.5px] text-gray-600 mb-5">{accessError}</p>
          <Link
            href="/dashboard/messages"
            className="inline-block h-10 px-5 bg-primary text-white rounded-sm font-semibold text-[13.5px] hover:bg-dark transition-colors leading-[40px]"
          >
            Back to messages
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-[70vh] lg:h-screen bg-offWhite">
      <ChatHeader
        other={other}
        listing={listing}
        connected={connected}
        otherTyping={otherTyping}
      />
      <MessageList
        ref={scrollRef}
        messages={messages}
        myId={user._id}
        otherTyping={otherTyping}
        otherFirstName={other?.name?.split(' ')[0]}
      />
      <MessageInput
        draft={draft}
        onChange={onDraftChange}
        onSend={send}
        sending={sending}
        disabled={!connected}
        placeholder={isViewerTenant ? 'Message the owner…' : 'Reply to tenant…'}
      />
    </div>
  )
}
