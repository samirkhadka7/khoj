import type { Request, Response } from 'express'
import mongoose, { type FilterQuery } from 'mongoose'
import {
  User,
  Listing,
  ContactRequest,
  Review,
  Kyc,
  AuditLog,
  type IUser,
} from '../models'
import { asyncHandler } from '../utils/asyncHandler'
import { createNotification } from '../utils/notifications'
import { deleteKycAsset, type KycAssetRef } from '../utils/cloudinary'
import { escapeRegex } from '../utils/escapeRegex'
import { decrypt } from '../utils/crypto'
import { audit } from '../utils/audit'

/**
 * KYC PII is stored AES-256-GCM encrypted (Feature 4). The admin review queue
 * needs it in the clear to display, so we decrypt it HERE — an authorized admin
 * path — but never expose the encrypted document refs: those are fetched as
 * short-lived signed links via GET /api/kyc/:id/documents.
 */
const safeDecrypt = (cipher?: string): string => {
  if (!cipher) return ''
  try {
    return decrypt(cipher)
  } catch {
    return ''
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sanitizeKycForAdmin = (kyc: any) => ({
  _id: kyc._id,
  userId: kyc.userId, // populated (name/email/photo)
  reviewedBy: kyc.reviewedBy, // populated (name)
  legalName: safeDecrypt(kyc.legalName),
  phone: safeDecrypt(kyc.phone),
  address: {
    district: safeDecrypt(kyc.address?.district),
    area: safeDecrypt(kyc.address?.area),
  },
  isPhoneVerified: kyc.isPhoneVerified,
  status: kyc.status,
  rejectionReason: kyc.rejectionReason,
  submittedAt: kyc.submittedAt,
  reviewedAt: kyc.reviewedAt,
  createdAt: kyc.createdAt,
})

/* -------------------------------------------------------------------------- */
/*  GET /api/admin/stats                                                       */
/*  Dashboard summary — counts only, fast on indexed fields.                  */
/* -------------------------------------------------------------------------- */

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const [
    totalUsers,
    bannedUsers,
    totalListings,
    pendingVerifications,
    reportedListings,
    totalContactRequests,
    acceptedContactRequests,
    totalReviews,
    pendingKyc,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isBanned: true }),
    Listing.countDocuments(),
    Listing.countDocuments({ isVerified: false }),
    Listing.countDocuments({ 'reports.0': { $exists: true } }),
    ContactRequest.countDocuments(),
    ContactRequest.countDocuments({ status: 'accepted' }),
    Review.countDocuments(),
    Kyc.countDocuments({ status: 'pending' }),
  ])

  res.json({
    success: true,
    data: {
      users: { total: totalUsers, banned: bannedUsers },
      listings: {
        total: totalListings,
        pendingVerification: pendingVerifications,
        reported: reportedListings,
      },
      contactRequests: { total: totalContactRequests, accepted: acceptedContactRequests },
      reviews: { total: totalReviews },
      kyc: { pending: pendingKyc },
    },
  })
})

/* -------------------------------------------------------------------------- */
/*  GET /api/admin/listings/pending                                            */
/* -------------------------------------------------------------------------- */

export const listPendingVerifications = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12))

  const filter = { isVerified: false }
  const total = await Listing.countDocuments(filter)
  const items = await Listing.find(filter)
    .sort({ createdAt: 1 }) // oldest first — FIFO queue
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('ownerId', 'name email phone profilePhoto isVerified')

  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  })
})

/* -------------------------------------------------------------------------- */
/*  PATCH /api/admin/listings/:id/verify                                       */
/* -------------------------------------------------------------------------- */

export const verifyListing = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid listing id' })
    return
  }

  const listing = await Listing.findByIdAndUpdate(
    id,
    { $set: { isVerified: true } },
    { new: true }
  )

  if (!listing) {
    res.status(404).json({ success: false, message: 'Listing not found' })
    return
  }

  await createNotification({
    userId: listing.ownerId,
    type: 'listing_verified',
    message: `Your listing "${listing.title}" has been verified by BaasKhoj`,
    relatedId: listing._id,
  })

  audit({ action: 'listing.verify', actorId: req.user!.userId, targetId: listing._id, ip: req.ip, outcome: 'success' })
  res.json({ success: true, data: listing })
})

/* -------------------------------------------------------------------------- */
/*  PATCH /api/admin/listings/:id/unverify                                     */
/* -------------------------------------------------------------------------- */

export const unverifyListing = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid listing id' })
    return
  }

  const listing = await Listing.findByIdAndUpdate(
    id,
    { $set: { isVerified: false } },
    { new: true }
  )

  if (!listing) {
    res.status(404).json({ success: false, message: 'Listing not found' })
    return
  }

  // No notification on unverify — admin's reason for revoking is usually internal
  audit({ action: 'listing.unverify', actorId: req.user!.userId, targetId: listing._id, ip: req.ip, outcome: 'success' })
  res.json({ success: true, data: listing })
})

/* -------------------------------------------------------------------------- */
/*  GET /api/admin/reports                                                     */
/*  All listings that have at least one report.                               */
/* -------------------------------------------------------------------------- */

export const listReportedListings = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12))

  // 'reports.0': { $exists: true } means "the array has at least one element"
  const filter = { 'reports.0': { $exists: true } }
  const total = await Listing.countDocuments(filter)
  const items = await Listing.find(filter)
    .sort({ updatedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('ownerId', 'name email')
    .populate('reports.userId', 'name email')

  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  })
})

/* -------------------------------------------------------------------------- */
/*  GET /api/admin/users                                                       */
/*  Optional ?search (matches name OR email), ?role, ?banned=true             */
/* -------------------------------------------------------------------------- */

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))

  const filter: FilterQuery<IUser> = {}

  if (req.query.role && ['user', 'owner', 'admin'].includes(String(req.query.role))) {
    filter.role = req.query.role as IUser['role']
  }
  if (req.query.banned === 'true') filter.isBanned = true
  if (req.query.banned === 'false') filter.isBanned = false

  if (req.query.search) {
    // Escape to prevent ReDoS on admin search input
    const re = new RegExp(escapeRegex(String(req.query.search)), 'i')
    filter.$or = [{ name: re }, { email: re }]
  }

  const total = await User.countDocuments(filter)
  const items = await User.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)

  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  })
})

/* -------------------------------------------------------------------------- */
/*  PATCH /api/admin/users/:id/ban                                             */
/* -------------------------------------------------------------------------- */

export const banUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid user id' })
    return
  }

  const user = await User.findById(id)
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' })
    return
  }

  // Defensive guards — banning admins (including yourself) is never allowed via API.
  // Admin role changes happen at the DB level only.
  if (user._id.toString() === req.user!.userId) {
    res.status(400).json({ success: false, message: 'You cannot ban yourself' })
    return
  }
  if (user.role === 'admin') {
    res.status(400).json({ success: false, message: 'Cannot ban an admin user' })
    return
  }

  user.isBanned = true
  await user.save()

  audit({ action: 'admin.user.ban', actorId: req.user!.userId, targetId: user._id, ip: req.ip, outcome: 'success' })
  res.json({ success: true, data: user })
})

/* -------------------------------------------------------------------------- */
/*  PATCH /api/admin/users/:id/unban                                           */
/* -------------------------------------------------------------------------- */

export const unbanUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid user id' })
    return
  }

  const user = await User.findByIdAndUpdate(
    id,
    { $set: { isBanned: false } },
    { new: true }
  )

  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' })
    return
  }

  audit({ action: 'admin.user.unban', actorId: req.user!.userId, targetId: user._id, ip: req.ip, outcome: 'success' })
  res.json({ success: true, data: user })
})

/* -------------------------------------------------------------------------- */
/*  GET /api/admin/kyc                                                         */
/*  Lists KYC applications. Optional ?status=pending|approved|rejected.       */
/* -------------------------------------------------------------------------- */

export const listKyc = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))

  const status = req.query.status as 'pending' | 'approved' | 'rejected' | undefined
  const filter: Record<string, unknown> = {}
  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    filter.status = status
  }

  const total = await Kyc.countDocuments(filter)
  // Pending oldest-first (FIFO queue), reviewed newest-first.
  // Mongoose accepts a string-form sort spec, which keeps the type system happy
  // (the `{ a: 1 } | { b: -1 }` discriminated form trips on `undefined` keys).
  const sortSpec = status === 'pending' || !status ? 'submittedAt' : '-reviewedAt'

  const items = await Kyc.find(filter)
    .sort(sortSpec)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('userId', 'name email profilePhoto createdAt')
    .populate('reviewedBy', 'name')

  res.json({
    success: true,
    // Decrypt PII for admin display; encrypted document refs are never returned.
    data: items.map(sanitizeKycForAdmin),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  })
})

/* -------------------------------------------------------------------------- */
/*  PATCH /api/admin/kyc/:id/approve                                           */
/*  Approve KYC AND flip the user's role to 'owner'.                          */
/* -------------------------------------------------------------------------- */

export const approveKyc = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid KYC id' })
    return
  }

  const kyc = await Kyc.findById(id)
  if (!kyc) {
    res.status(404).json({ success: false, message: 'KYC application not found' })
    return
  }

  if (kyc.status === 'approved') {
    res.status(400).json({ success: false, message: 'Already approved' })
    return
  }

  kyc.status = 'approved'
  kyc.reviewedBy = new mongoose.Types.ObjectId(req.user!.userId)
  kyc.reviewedAt = new Date()
  kyc.rejectionReason = undefined
  await kyc.save()

  // CRITICAL — flip the user's role to 'owner'. This is the ONLY code path
  // that can elevate a user to 'owner'. Listing creation later just checks role.
  // Don't downgrade admins (in case admin somehow has a KYC application).
  await User.updateOne(
    { _id: kyc.userId, role: { $ne: 'admin' } },
    { $set: { role: 'owner' } }
  )

  await createNotification({
    userId: kyc.userId,
    type: 'kyc_approved',
    message: 'Your owner application has been approved! You can now list properties.',
    relatedId: kyc._id,
  })

  audit({ action: 'kyc.approve', actorId: req.user!.userId, targetId: kyc.userId, ip: req.ip, outcome: 'success', meta: { kycId: kyc._id.toString() } })
  res.json({ success: true, data: kyc })
})

/* -------------------------------------------------------------------------- */
/*  PATCH /api/admin/kyc/:id/reject                                            */
/*  Reject with a reason. User can later resubmit.                            */
/* -------------------------------------------------------------------------- */

export const rejectKyc = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const { reason } = req.body as { reason?: string }

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid KYC id' })
    return
  }
  if (!reason || reason.trim().length < 5) {
    res.status(400).json({ success: false, message: 'Rejection reason is required (min 5 chars)' })
    return
  }

  const kyc = await Kyc.findById(id)
  if (!kyc) {
    res.status(404).json({ success: false, message: 'KYC application not found' })
    return
  }

  if (kyc.status === 'rejected') {
    res.status(400).json({ success: false, message: 'Already rejected' })
    return
  }

  // Snapshot the ENCRYPTED refs before mutating so we can delete the private
  // Cloudinary assets. (Feature 4: these fields are AES-GCM ciphertext of
  // { publicId, resourceType, format } — NOT URLs. The old URL-based delete
  // silently no-op'd on ciphertext, orphaning rejected applicants' ID scans.)
  const oldRefs = [kyc.citizenshipFront, kyc.citizenshipBack, kyc.selfieWithId]
    .map((c) => {
      try {
        return JSON.parse(decrypt(c)) as KycAssetRef
      } catch {
        return null
      }
    })
    .filter((r): r is KycAssetRef => r !== null)

  kyc.status = 'rejected'
  kyc.rejectionReason = reason.trim()
  kyc.reviewedBy = new mongoose.Types.ObjectId(req.user!.userId)
  kyc.reviewedAt = new Date()
  await kyc.save()

  // Fire-and-forget — admin already saw the reject succeed.
  for (const ref of oldRefs) void deleteKycAsset(ref)

  await createNotification({
    userId: kyc.userId,
    type: 'kyc_rejected',
    message: `Your owner application was rejected: ${reason.trim()}`,
    relatedId: kyc._id,
  })

  // Note: the rejection REASON text is intentionally not logged (may hold notes/PII).
  audit({ action: 'kyc.reject', actorId: req.user!.userId, targetId: kyc.userId, ip: req.ip, outcome: 'success', meta: { kycId: kyc._id.toString() } })
  res.json({ success: true, data: kyc })
})

/* -------------------------------------------------------------------------- */
/*  GET /api/admin/audit-logs                                                  */
/*  Admin-only viewer over the audit trail (Feature 6). MFA-gated + rate-       */
/*  limited via the admin router. Filters: ?action (prefix), ?outcome,          */
/*  ?actorId, ?since (ISO date), plus pagination.                              */
/* -------------------------------------------------------------------------- */

export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25))

  const filter: Record<string, unknown> = {}
  // Prefix match so ?action=login catches login.success AND login.failure, etc.
  // Input is escaped via escapeRegex (no unescaped user metacharacters) — ReDoS-safe.
  if (req.query.action) {
    // nosemgrep: regex_injection_dos
    filter.action = new RegExp('^' + escapeRegex(String(req.query.action)))
  }
  if (req.query.outcome === 'success' || req.query.outcome === 'failure') {
    filter.outcome = req.query.outcome
  }
  if (req.query.actorId && mongoose.isValidObjectId(String(req.query.actorId))) {
    filter.actorId = req.query.actorId
  }
  const since = req.query.since ? new Date(String(req.query.since)) : null
  if (since && !Number.isNaN(since.getTime())) {
    filter.createdAt = { $gte: since }
  }

  const total = await AuditLog.countDocuments(filter)
  const items = await AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('actorId', 'name email role')

  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  })
})
