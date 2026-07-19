import type { Request, Response } from 'express'
import { User, Listing, Kyc, Review, ContactRequest } from '../models'
import { asyncHandler } from '../utils/asyncHandler'
import { decrypt } from '../utils/crypto'
import { audit } from '../utils/audit'

/** Decrypt but never throw (legacy/placeholder rows return ''). */
const safeDecrypt = (cipher?: string): string => {
  if (!cipher) return ''
  try {
    return decrypt(cipher)
  } catch {
    return ''
  }
}

/* -------------------------------------------------------------------------- */
/*  GET /api/users/me/export   (protected, rate-limited)                       */
/*  The user downloads THEIR OWN data as JSON (GDPR-style portability).         */
/* -------------------------------------------------------------------------- */

export const exportMyData = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId

  const user = await User.findById(userId)
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' })
    return
  }

  // Profile — safe fields only. NEVER passwordHash / passwordHistory / mfaSecret /
  // mfaBackupCodes (all select:false anyway, but be explicit about what we emit).
  const profile = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    bio: user.bio,
    isVerified: user.isVerified,
    isPhoneVerified: user.isPhoneVerified,
    mfaEnabled: user.mfaEnabled,
    createdAt: user.createdAt,
  }

  // Owned listings — strip `reports` and `wishlistedBy`: those hold OTHER users' ids.
  const listings = await Listing.find({ ownerId: userId }).select('-reports -wishlistedBy')

  // KYC — decrypt the user's own PII, but NEVER the document refs (those stay
  // access-controlled behind the signed-URL endpoint, not bundled into a file).
  const kycDoc = await Kyc.findOne({ userId }).select('+legalName +phone')
  const kyc = kycDoc
    ? {
        status: kycDoc.status,
        legalName: safeDecrypt(kycDoc.legalName),
        phone: safeDecrypt(kycDoc.phone),
        address: {
          district: safeDecrypt(kycDoc.address?.district),
          area: safeDecrypt(kycDoc.address?.area),
        },
        rejectionReason: kycDoc.rejectionReason,
        submittedAt: kycDoc.submittedAt,
        reviewedAt: kycDoc.reviewedAt,
      }
    : null

  // Reviews the user wrote.
  const reviews = await Review.find({ tenantId: userId })

  // Contact requests — metadata the user already has access to (the other party is
  // only an id reference; no foreign profile/PII is populated in).
  const sent = await ContactRequest.find({ tenantId: userId })
  const received = await ContactRequest.find({ ownerId: userId })

  const payload = {
    exportedAt: new Date().toISOString(),
    profile,
    kyc,
    listings,
    reviews,
    contactRequests: { sent, received },
  }

  audit({ action: 'user.data.export', actorId: userId, ip: req.ip, outcome: 'success' })
  res.setHeader('Content-Disposition', 'attachment; filename="baaskhoj-data-export.json"')
  res.json({ success: true, data: payload })
})

/* -------------------------------------------------------------------------- */
/*  POST /api/users/me/import   (protected)                                    */
/*  Re-imports ONLY the same whitelist updateProfile accepts (name/bio/phone).  */
/*  Treats the uploaded file as untrusted input — role/verification/KYC/etc.    */
/*  in the file are ignored, exactly like the manual profile update.           */
/* -------------------------------------------------------------------------- */

export const importMyData = asyncHandler(async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  // Accept either the full export shape ({ profile: {...} }) or a bare profile object.
  const src = (body.profile as Record<string, unknown> | undefined) ?? body

  // WHITELIST — identical to updateProfile. Anything else in the file is ignored.
  const updates: Record<string, string> = {}
  if (typeof src.name === 'string') updates.name = src.name.trim()
  if (typeof src.bio === 'string') updates.bio = src.bio.trim()
  if (typeof src.phone === 'string') updates.phone = src.phone.trim()

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ success: false, message: 'No importable profile fields (name, bio, phone)' })
    return
  }

  const user = await User.findByIdAndUpdate(req.user!.userId, updates, {
    new: true,
    runValidators: true, // re-run schema validation (e.g. phone format)
  })
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' })
    return
  }

  audit({
    action: 'user.data.import',
    actorId: req.user!.userId,
    ip: req.ip,
    outcome: 'success',
    meta: { fields: Object.keys(updates) },
  })
  res.json({
    success: true,
    data: { _id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, bio: user.bio },
  })
})
