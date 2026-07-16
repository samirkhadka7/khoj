import { Types } from 'mongoose'
import { Notification } from '../models'
import type { NotificationType } from '../types'

/**
 * Insert an in-app notification. The bell-icon dropdown polls /api/notifications
 * to render these. Failures are logged but never thrown — a notification miss
 * should not break the underlying business operation (e.g. a failed notification
 * insert must not roll back a successful contact-request creation).
 */
export const createNotification = async (params: {
  userId: string | Types.ObjectId
  type: NotificationType
  message: string
  relatedId: string | Types.ObjectId
}): Promise<void> => {
  try {
    await Notification.create({
      userId: params.userId,
      type: params.type,
      message: params.message,
      relatedId: params.relatedId,
      read: false,
    })
  } catch (err) {
    console.error('[Notification] Failed to insert:', err)
  }
}
