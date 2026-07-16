import { Schema, model, Types } from 'mongoose'

/**
 * A tenant can review an owner/listing ONLY after their contact request was accepted.
 * One review per (tenant, contactRequest) — enforced by the unique compound index below.
 */
export interface IReview {
  _id: Types.ObjectId
  tenantId: Types.ObjectId
  ownerId: Types.ObjectId
  listingId: Types.ObjectId
  contactRequestId: Types.ObjectId
  rating: number
  comment?: string
  createdAt: Date
  updatedAt: Date
}

const reviewSchema = new Schema<IReview>(
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
    contactRequestId: {
      type: Schema.Types.ObjectId,
      ref: 'ContactRequest',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comment: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
)

// Prevent duplicate reviews — one tenant can leave only one review per accepted contact request
reviewSchema.index({ tenantId: 1, contactRequestId: 1 }, { unique: true })

export const Review = model<IReview>('Review', reviewSchema)
