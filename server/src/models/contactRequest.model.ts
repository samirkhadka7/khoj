import { Schema, model, Types } from 'mongoose'
import type { RequestStatus } from '../types'

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000

export interface IContactRequest {
  _id: Types.ObjectId
  tenantId: Types.ObjectId
  ownerId: Types.ObjectId
  listingId: Types.ObjectId
  message: string
  status: RequestStatus
  respondedAt?: Date
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

const contactRequestSchema = new Schema<IContactRequest>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    listingId: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      maxlength: 1000,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'expired'],
      default: 'pending',
      index: true,
    },
    respondedAt: { type: Date },
    expiresAt: {
      type: Date,
      // Defer evaluation so each new doc gets `now + 48h` at insert time, not at schema-load time
      default: () => new Date(Date.now() + FORTY_EIGHT_HOURS_MS),
    },
  },
  { timestamps: true }
)

// Index used by the hourly cron job that flips expired pendings → 'expired'
contactRequestSchema.index({ status: 1, expiresAt: 1 })

// IMPORTANT: do NOT use a TTL index on expiresAt — TTL would DELETE the doc.
// We want to keep the document and just update status to 'expired' for history.

export const ContactRequest = model<IContactRequest>('ContactRequest', contactRequestSchema)
