import { Schema, model, Types } from 'mongoose'
import type { NotificationType } from '../types'

/**
 * In-app notifications shown in the bell-icon dropdown.
 * `relatedId` points to the relevant entity (ContactRequest / Listing / Review)
 * — frontend uses `type` to decide where to navigate when the notification is clicked.
 */
export interface INotification {
  _id: Types.ObjectId
  userId: Types.ObjectId
  type: NotificationType
  message: string
  relatedId: Types.ObjectId
  read: boolean
  createdAt: Date
  updatedAt: Date
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'contact_request',
        'request_accepted',
        'request_rejected',
        'new_review',
        'listing_verified',
        'kyc_approved',
        'kyc_rejected',
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    relatedId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
)

// Compound index for the bell-icon query: "newest unread notifications for this user"
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 })

export const Notification = model<INotification>('Notification', notificationSchema)
