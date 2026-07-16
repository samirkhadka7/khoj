import type { Request, Response } from 'express'
import mongoose from 'mongoose'
import { Notification } from '../models'
import { asyncHandler } from '../utils/asyncHandler'

/* -------------------------------------------------------------------------- */
/*  GET /api/notifications                                                    */
/*  List the current user's notifications (paginated, optional ?unread=true). */
/* -------------------------------------------------------------------------- */

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12))

  const filter: Record<string, unknown> = { userId: req.user!.userId }
  if (req.query.unread === 'true') filter.read = false

  const total = await Notification.countDocuments(filter)
  const items = await Notification.find(filter)
    .sort({ createdAt: -1 })
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
/*  GET /api/notifications/unread-count                                       */
/*  Lightweight endpoint for the bell-icon badge — polled frequently.         */
/* -------------------------------------------------------------------------- */

export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const count = await Notification.countDocuments({
    userId: req.user!.userId,
    read: false,
  })
  res.json({ success: true, data: { count } })
})

/* -------------------------------------------------------------------------- */
/*  PATCH /api/notifications/:id/read   (mark one as read)                    */
/* -------------------------------------------------------------------------- */

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid notification id' })
    return
  }

  // Scope by userId so a user can't mark someone else's notification read
  const notification = await Notification.findOneAndUpdate(
    { _id: id, userId: req.user!.userId },
    { $set: { read: true } },
    { new: true }
  )

  if (!notification) {
    res.status(404).json({ success: false, message: 'Notification not found' })
    return
  }

  res.json({ success: true, data: notification })
})

/* -------------------------------------------------------------------------- */
/*  PATCH /api/notifications/read-all   (mark every unread as read)           */
/* -------------------------------------------------------------------------- */

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const result = await Notification.updateMany(
    { userId: req.user!.userId, read: false },
    { $set: { read: true } }
  )

  res.json({
    success: true,
    data: { modifiedCount: result.modifiedCount },
  })
})
