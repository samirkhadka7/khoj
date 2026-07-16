import type { Request, Response } from 'express'
import mongoose from 'mongoose'
import {
  ContactRequest,
  Listing,
  User,
  type IContactRequest,
} from '../models'
import { asyncHandler } from '../utils/asyncHandler'
import { createNotification } from '../utils/notifications'
import { sendSMS } from '../utils/sparrowSMS'

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Quick check: if a request's expiresAt has passed but status is still 'pending'
 * (because the cron hasn't run since it expired), flip it to 'expired' and
 * persist the change. Used in accept/reject so an owner can't act on an
 * already-stale request.
 */
const expireIfStale = async (request: IContactRequest): Promise<boolean> => {
  if (request.status === 'pending' && request.expiresAt < new Date()) {
    await ContactRequest.updateOne(
      { _id: request._id },
      { $set: { status: 'expired' } }
    )
    return true
  }
  return false
}

/* -------------------------------------------------------------------------- */
/*  POST /api/contact-request                                                  */
/* -------------------------------------------------------------------------- */

export const sendContactRequest = asyncHandler(async (req: Request, res: Response) => {
  const { listingId, message } = req.body as { listingId?: string; message?: string }

  if (!listingId || !message) {
    res.status(400).json({ success: false, message: 'listingId and message are required' })
    return
  }

  if (!mongoose.isValidObjectId(listingId)) {
    res.status(400).json({ success: false, message: 'Invalid listing id' })
    return
  }

  if (message.trim().length < 5) {
    res.status(400).json({ success: false, message: 'Message must be at least 5 characters' })
    return
  }

  const listing = await Listing.findById(listingId)
  if (!listing) {
    res.status(404).json({ success: false, message: 'Listing not found' })
    return
  }

  if (!listing.isAvailable) {
    res.status(400).json({ success: false, message: 'This listing is no longer available' })
    return
  }

  // CRITICAL business rule — can't contact your own listing
  if (listing.ownerId.toString() === req.user!.userId) {
    res.status(400).json({ success: false, message: 'You cannot contact your own listing' })
    return
  }

  // Prevent duplicates: block if there's already a pending OR accepted request.
  // Users may retry only after rejected/expired.
  const existing = await ContactRequest.findOne({
    tenantId: req.user!.userId,
    listingId,
    status: { $in: ['pending', 'accepted'] },
  }).sort({ createdAt: -1 })
  if (existing) {
    res.status(409).json({
      success: false,
      message:
        existing.status === 'accepted'
          ? 'Your request was already accepted. Check your dashboard for contact info.'
          : 'You already have a pending request for this listing',
    })
    return
  }

  const request = await ContactRequest.create({
    tenantId: req.user!.userId,
    ownerId: listing.ownerId,
    listingId: listing._id,
    message: message.trim(),
    // status + expiresAt come from the schema defaults (pending, now+48h)
  })

  // Fire notification + SMS to owner (don't await SMS — we don't want the
  // request to fail just because a side-channel did)
  const tenant = await User.findById(req.user!.userId)
  const tenantName = tenant?.name ?? 'Someone'

  await createNotification({
    userId: listing.ownerId,
    type: 'contact_request',
    message: `${tenantName} wants to contact you about "${listing.title}"`,
    relatedId: request._id,
  })

  // SMS to owner — needs phone; skip silently if the owner has not added one yet
  const owner = await User.findById(listing.ownerId)
  if (owner?.phone) {
    void sendSMS(
      owner.phone,
      `BaasKhoj: New contact request for "${listing.title}" from ${tenantName}. Open the app to accept or reject.`
    )
  }

  res.status(201).json({ success: true, data: request })
})

/* -------------------------------------------------------------------------- */
/*  GET /api/contact-request/received   (owner sees their inbox)              */
/* -------------------------------------------------------------------------- */

export const listReceived = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as IContactRequest['status'] | undefined
  const filter: Record<string, unknown> = { ownerId: req.user!.userId }
  if (status && ['pending', 'accepted', 'rejected', 'expired'].includes(status)) {
    filter.status = status
  }

  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))

  const total = await ContactRequest.countDocuments(filter)
  const requests = await ContactRequest.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('tenantId', 'name profilePhoto bio isVerified')
    .populate('listingId', 'title images price location.area')

  res.json({
    success: true,
    data: requests,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  })
})

/* -------------------------------------------------------------------------- */
/*  GET /api/contact-request/sent   (tenant sees their outbox)                */
/* -------------------------------------------------------------------------- */

export const listSent = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as IContactRequest['status'] | undefined
  const filter: Record<string, unknown> = { tenantId: req.user!.userId }
  if (status && ['pending', 'accepted', 'rejected', 'expired'].includes(status)) {
    filter.status = status
  }
  // Optional ?listingId filter — used by the listing detail page to check
  // "do I have a request for THIS listing?" without paginating through all sent.
  const listingId = req.query.listingId as string | undefined
  if (listingId && mongoose.isValidObjectId(listingId)) {
    filter.listingId = listingId
  }

  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))

  const total = await ContactRequest.countDocuments(filter)
  const requests = await ContactRequest.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('ownerId', 'name profilePhoto isVerified')
    .populate('listingId', 'title images price location.area')

  res.json({
    success: true,
    data: requests,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  })
})

/* -------------------------------------------------------------------------- */
/*  PATCH /api/contact-request/:id/accept   (owner only)                      */
/* -------------------------------------------------------------------------- */

export const acceptRequest = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid request id' })
    return
  }

  const request = await ContactRequest.findById(id)
  if (!request) {
    res.status(404).json({ success: false, message: 'Contact request not found' })
    return
  }

  // Only the listing's owner may accept
  if (request.ownerId.toString() !== req.user!.userId) {
    res.status(403).json({ success: false, message: 'Only the listing owner can respond' })
    return
  }

  if (await expireIfStale(request)) {
    res.status(400).json({ success: false, message: 'Request has expired' })
    return
  }

  if (request.status !== 'pending') {
    res.status(400).json({ success: false, message: `Request already ${request.status}` })
    return
  }

  request.status = 'accepted'
  request.respondedAt = new Date()
  await request.save()

  // Notify tenant — both in-app and SMS
  const listing = await Listing.findById(request.listingId).select('title')
  const owner = await User.findById(request.ownerId).select('name phone')
  const tenant = await User.findById(request.tenantId).select('phone')
  const listingTitle = listing?.title ?? 'a listing'

  await createNotification({
    userId: request.tenantId,
    type: 'request_accepted',
    message: `${owner?.name ?? 'The owner'} accepted your request for "${listingTitle}"`,
    relatedId: request._id,
  })

  if (tenant?.phone) {
    void sendSMS(
      tenant.phone,
      `BaasKhoj: Your contact request for "${listingTitle}" was accepted! Open the app to view contact details.`
    )
  }

  res.json({ success: true, data: request })
})

/* -------------------------------------------------------------------------- */
/*  PATCH /api/contact-request/:id/reject   (owner only)                      */
/* -------------------------------------------------------------------------- */

export const rejectRequest = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid request id' })
    return
  }

  const request = await ContactRequest.findById(id)
  if (!request) {
    res.status(404).json({ success: false, message: 'Contact request not found' })
    return
  }

  if (request.ownerId.toString() !== req.user!.userId) {
    res.status(403).json({ success: false, message: 'Only the listing owner can respond' })
    return
  }

  if (await expireIfStale(request)) {
    res.status(400).json({ success: false, message: 'Request has expired' })
    return
  }

  if (request.status !== 'pending') {
    res.status(400).json({ success: false, message: `Request already ${request.status}` })
    return
  }

  request.status = 'rejected'
  request.respondedAt = new Date()
  await request.save()

  const listing = await Listing.findById(request.listingId).select('title')
  const listingTitle = listing?.title ?? 'a listing'

  await createNotification({
    userId: request.tenantId,
    type: 'request_rejected',
    message: `Your contact request for "${listingTitle}" was declined`,
    relatedId: request._id,
  })

  res.json({ success: true, data: request })
})

/* -------------------------------------------------------------------------- */
/*  GET /api/contact-request/:id/contact-info                                 */
/*  THE CRITICAL ENDPOINT — owner phone/WhatsApp revealed only on accept.     */
/* -------------------------------------------------------------------------- */

export const getContactInfo = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid request id' })
    return
  }

  const request = await ContactRequest.findById(id)
  if (!request) {
    res.status(404).json({ success: false, message: 'Contact request not found' })
    return
  }

  // Only the tenant who sent the request can fetch contact info — and only after acceptance
  if (request.tenantId.toString() !== req.user!.userId) {
    res.status(403).json({ success: false, message: 'You can only view your own request contact info' })
    return
  }

  if (request.status !== 'accepted') {
    res.status(403).json({
      success: false,
      message: `Contact info is only available after the owner accepts (current status: ${request.status})`,
    })
    return
  }

  const owner = await User.findById(request.ownerId).select('name phone profilePhoto')
  if (!owner) {
    res.status(404).json({ success: false, message: 'Owner not found' })
    return
  }

  if (!owner.phone) {
    res.status(404).json({
      success: false,
      message: 'Owner has not added a phone number yet',
    })
    return
  }

  const listing = await Listing.findById(request.listingId).select('title')
  const listingTitle = listing?.title ?? 'your listing'

  // Strip non-digits, ensure 977 country code for WhatsApp deep link
  const digits = owner.phone.replace(/\D/g, '')
  const intlNumber = digits.startsWith('977') ? digits : `977${digits}`
  const greeting = `Namaste, BaasKhoj bata contact gardachu "${listingTitle}" ko bareme`
  const whatsappLink = `https://wa.me/${intlNumber}?text=${encodeURIComponent(greeting)}`

  res.json({
    success: true,
    data: {
      ownerName: owner.name,
      phone: owner.phone,
      whatsappLink,
    },
  })
})
