import type { Request, Response } from 'express'
import mongoose from 'mongoose'
import { Review, Listing, ContactRequest, User } from '../models'
import { asyncHandler } from '../utils/asyncHandler'
import { createNotification } from '../utils/notifications'

/* -------------------------------------------------------------------------- */
/*  Helper: recompute listing aggregate rating after add/change               */
/* -------------------------------------------------------------------------- */

/**
 * Recomputes averageRating and totalReviews on the listing using one aggregation
 * pipeline. Cheaper and more accurate than tracking incremental updates — and
 * avoids drift if a review is ever deleted manually.
 */
const recomputeListingRating = async (listingId: mongoose.Types.ObjectId): Promise<void> => {
  const stats = await Review.aggregate<{ _id: null; avg: number; count: number }>([
    { $match: { listingId } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ])

  const averageRating = stats[0]?.avg ?? 0
  const totalReviews = stats[0]?.count ?? 0

  await Listing.findByIdAndUpdate(listingId, {
    // Round to 1 decimal so the UI shows "4.7" instead of "4.6666666..."
    averageRating: Math.round(averageRating * 10) / 10,
    totalReviews,
  })
}

/* -------------------------------------------------------------------------- */
/*  POST /api/reviews   (tenant — only after contact accepted)                */
/* -------------------------------------------------------------------------- */

export const createReview = asyncHandler(async (req: Request, res: Response) => {
  const { contactRequestId, rating, comment } = req.body as {
    contactRequestId?: string
    rating?: number
    comment?: string
  }

  if (!contactRequestId || rating === undefined) {
    res.status(400).json({ success: false, message: 'contactRequestId and rating are required' })
    return
  }

  if (!mongoose.isValidObjectId(contactRequestId)) {
    res.status(400).json({ success: false, message: 'Invalid contactRequestId' })
    return
  }

  const numericRating = Number(rating)
  if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
    res.status(400).json({ success: false, message: 'Rating must be a number between 1 and 5' })
    return
  }

  const request = await ContactRequest.findById(contactRequestId)
  if (!request) {
    res.status(404).json({ success: false, message: 'Contact request not found' })
    return
  }

  // Only the tenant of an ACCEPTED request can leave a review
  if (request.tenantId.toString() !== req.user!.userId) {
    res.status(403).json({ success: false, message: 'Only the tenant who sent the request can review' })
    return
  }
  if (request.status !== 'accepted') {
    res.status(403).json({
      success: false,
      message: `Reviews are only allowed after the owner accepts (status: ${request.status})`,
    })
    return
  }

  // The DB unique index on (tenantId, contactRequestId) is the ultimate guard,
  // but checking here gives a clean 409 instead of an opaque MongoServerError.
  const existing = await Review.findOne({
    tenantId: request.tenantId,
    contactRequestId: request._id,
  })
  if (existing) {
    res.status(409).json({
      success: false,
      message: 'You have already reviewed this owner for this request',
    })
    return
  }

  const review = await Review.create({
    tenantId: request.tenantId,
    ownerId: request.ownerId,
    listingId: request.listingId,
    contactRequestId: request._id,
    rating: numericRating,
    comment: typeof comment === 'string' ? comment.trim() : undefined,
  })

  // Update listing aggregates and notify owner — neither failure should roll back the review
  await recomputeListingRating(request.listingId as mongoose.Types.ObjectId).catch((err) =>
    console.error('[Review] Failed to recompute listing rating:', err)
  )

  const tenant = await User.findById(request.tenantId).select('name')
  const listing = await Listing.findById(request.listingId).select('title')
  await createNotification({
    userId: request.ownerId,
    type: 'new_review',
    message: `${tenant?.name ?? 'A tenant'} left a ${numericRating}-star review on "${
      listing?.title ?? 'your listing'
    }"`,
    relatedId: review._id,
  })

  res.status(201).json({ success: true, data: review })
})

/* -------------------------------------------------------------------------- */
/*  GET /api/reviews/listing/:listingId   (public)                            */
/* -------------------------------------------------------------------------- */

export const listReviewsForListing = asyncHandler(async (req: Request, res: Response) => {
  const { listingId } = req.params

  if (!mongoose.isValidObjectId(listingId)) {
    res.status(400).json({ success: false, message: 'Invalid listing id' })
    return
  }

  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12))

  const total = await Review.countDocuments({ listingId })
  const items = await Review.find({ listingId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('tenantId', 'name profilePhoto')

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
