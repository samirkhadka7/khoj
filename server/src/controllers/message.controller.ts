import type { Request, Response } from 'express'
import { Message } from '../models'
import { asyncHandler } from '../utils/asyncHandler'
import { authorizeChat } from '../utils/chatAuth'

/* -------------------------------------------------------------------------- */
/*  GET /api/messages/:contactRequestId                                        */
/*  Paginated chat history. Frontend calls this when opening a thread; new    */
/*  messages after that arrive via Socket.io 'chat:message' events.           */
/* -------------------------------------------------------------------------- */

export const listMessages = asyncHandler(async (req: Request, res: Response) => {
  const { contactRequestId } = req.params
  const request = await authorizeChat(contactRequestId, req.user!.userId)

  if (!request) {
    res.status(403).json({
      success: false,
      message: 'Chat is locked or you are not a participant',
    })
    return
  }

  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30))

  const total = await Message.countDocuments({ contactRequestId: request._id })
  const items = await Message.find({ contactRequestId: request._id })
    .sort({ createdAt: 1 }) // oldest first — natural chat thread order
    .skip((page - 1) * limit)
    .limit(limit)

  res.json({
    success: true,
    data: items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  })
})

/* -------------------------------------------------------------------------- */
/*  PATCH /api/messages/:contactRequestId/read                                 */
/*  Mark all unread messages addressed to ME in this conversation as read.    */
/*  Same effect as the Socket 'chat:read' event — provided as REST fallback   */
/*  for clients without an active socket connection.                          */
/* -------------------------------------------------------------------------- */

export const markChatRead = asyncHandler(async (req: Request, res: Response) => {
  const { contactRequestId } = req.params
  const request = await authorizeChat(contactRequestId, req.user!.userId)

  if (!request) {
    res.status(403).json({ success: false, message: 'Access denied' })
    return
  }

  const result = await Message.updateMany(
    { contactRequestId: request._id, receiverId: req.user!.userId, read: false },
    { $set: { read: true } }
  )

  res.json({ success: true, data: { modifiedCount: result.modifiedCount } })
})
