import type { Request, Response } from 'express'
import mongoose from 'mongoose'
import { Kyc, User, type IKyc } from '../models'
import { asyncHandler } from '../utils/asyncHandler'
import {
  uploadKycToCloudinary,
  signedKycDownloadUrl,
  deleteKycAsset,
  type KycAssetRef,
} from '../utils/cloudinary'
import { encrypt, decrypt } from '../utils/crypto'

/* -------------------------------------------------------------------------- */
/*  Encryption helpers (Feature 4)                                             */
/*  KYC PII + document references are stored AES-256-GCM encrypted at rest.    */
/* -------------------------------------------------------------------------- */

/** Encrypt a Cloudinary asset reference (publicId + type) as one ciphertext string. */
const encryptRef = (ref: KycAssetRef): string => encrypt(JSON.stringify(ref))

/** Decrypt a stored reference back into a usable KycAssetRef. */
const decryptRef = (cipher: string): KycAssetRef => JSON.parse(decrypt(cipher)) as KycAssetRef

/** Decrypt but never throw — legacy/placeholder rows return '' instead of crashing a read. */
const safeDecrypt = (cipher: string | undefined): string => {
  if (!cipher) return ''
  try {
    return decrypt(cipher)
  } catch {
    return ''
  }
}

/**
 * Shape returned to the KYC's OWN user: PII is decrypted (it's their data), but
 * the encrypted document references are never exposed — documents are fetched
 * via the gated signed-URL endpoint instead.
 */
const sanitizeKycForOwner = (kyc: IKyc) => ({
  _id: kyc._id,
  status: kyc.status,
  legalName: safeDecrypt(kyc.legalName),
  phone: safeDecrypt(kyc.phone),
  address: {
    district: safeDecrypt(kyc.address?.district),
    area: safeDecrypt(kyc.address?.area),
  },
  isPhoneVerified: kyc.isPhoneVerified,
  rejectionReason: kyc.rejectionReason,
  submittedAt: kyc.submittedAt,
  reviewedAt: kyc.reviewedAt,
  createdAt: kyc.createdAt,
})

/* -------------------------------------------------------------------------- */
/*  POST /api/kyc/submit   (any authenticated user)                            */
/*  Body: legalName, phone, district, area + 3 files via multipart            */
/*  Files (multer.fields): citizenshipFront, citizenshipBack, selfieWithId    */
/* -------------------------------------------------------------------------- */

export const submitKyc = asyncHandler(async (req: Request, res: Response) => {
  const { legalName, phone, district, area } = req.body as {
    legalName?: string
    phone?: string
    district?: string
    area?: string
  }

  if (!legalName || !phone || !district || !area) {
    res.status(400).json({
      success: false,
      message: 'legalName, phone, district, and area are all required',
    })
    return
  }

  if (!/^9\d{9}$/.test(phone.trim())) {
    res.status(400).json({
      success: false,
      message: 'Phone must be a 10-digit Nepali number starting with 9',
    })
    return
  }

  // Validate plaintext HERE (before encryption) — the model can no longer enforce
  // a length on legalName because it now stores ciphertext.
  const trimmedName = legalName.trim()
  if (trimmedName.length < 3 || trimmedName.length > 200) {
    res.status(400).json({ success: false, message: 'legalName must be 3–200 characters' })
    return
  }

  // multer.fields() puts each field's files into a named bucket
  const files = req.files as
    | Record<string, Express.Multer.File[] | undefined>
    | undefined
  const front = files?.citizenshipFront?.[0]
  const back = files?.citizenshipBack?.[0]
  const selfie = files?.selfieWithId?.[0]

  if (!front || !back || !selfie) {
    res.status(400).json({
      success: false,
      message: 'All three documents are required: citizenshipFront, citizenshipBack, selfieWithId',
    })
    return
  }

  // If the user already has a KYC, only allow resubmit when status === 'rejected'.
  // 'pending' / 'approved' should not start a new application silently.
  const existing = await Kyc.findOne({ userId: req.user!.userId })
  if (existing && existing.status === 'pending') {
    res.status(409).json({
      success: false,
      message: 'Your KYC is already under review',
    })
    return
  }
  if (existing && existing.status === 'approved') {
    res.status(409).json({
      success: false,
      message: 'You are already a verified owner',
    })
    return
  }

  // Upload all three documents as PRIVATE (authenticated) Cloudinary assets in
  // parallel. We get back opaque refs (publicId/type/format) — never URLs.
  const [frontRef, backRef, selfieRef] = await Promise.all([
    uploadKycToCloudinary(front, `baskhoj/kyc/${req.user!.userId}`),
    uploadKycToCloudinary(back, `baskhoj/kyc/${req.user!.userId}`),
    uploadKycToCloudinary(selfie, `baskhoj/kyc/${req.user!.userId}`),
  ])

  // Everything sensitive is encrypted before it touches the DB.
  const encryptedFields = {
    legalName: encrypt(trimmedName),
    phone: encrypt(phone.trim()),
    address: { district: encrypt(district.trim()), area: encrypt(area.trim()) },
    citizenshipFront: encryptRef(frontRef),
    citizenshipBack: encryptRef(backRef),
    selfieWithId: encryptRef(selfieRef),
  }

  if (existing) {
    // Resubmit after rejection — overwrite the existing doc and reset status.
    // Snapshot the OLD encrypted refs first so we can delete those private assets.
    const oldRefs = [existing.citizenshipFront, existing.citizenshipBack, existing.selfieWithId]
      .map((c) => {
        try {
          return decryptRef(c)
        } catch {
          return null
        }
      })
      .filter((r): r is KycAssetRef => r !== null)

    existing.legalName = encryptedFields.legalName
    existing.phone = encryptedFields.phone
    existing.address = encryptedFields.address
    existing.citizenshipFront = encryptedFields.citizenshipFront
    existing.citizenshipBack = encryptedFields.citizenshipBack
    existing.selfieWithId = encryptedFields.selfieWithId
    existing.status = 'pending'
    existing.rejectionReason = undefined
    existing.reviewedBy = undefined
    existing.reviewedAt = undefined
    existing.submittedAt = new Date()
    await existing.save()

    // Old private assets from the rejected submission — clean them up.
    for (const ref of oldRefs) void deleteKycAsset(ref)

    res.status(200).json({ success: true, data: sanitizeKycForOwner(existing) })
    return
  }

  const kyc = await Kyc.create({
    userId: req.user!.userId,
    ...encryptedFields,
    status: 'pending',
    submittedAt: new Date(),
  })

  // Sync the user's phone if they didn't have one yet. NOTE: User.phone stays
  // plaintext (separate model, needed for SMS + its own format validator) — we
  // pass the plaintext value here, not the encrypted KYC copy.
  await User.updateOne(
    { _id: req.user!.userId, $or: [{ phone: { $exists: false } }, { phone: '' }] },
    { $set: { phone: phone.trim() } }
  )

  res.status(201).json({ success: true, data: sanitizeKycForOwner(kyc) })
})

/* -------------------------------------------------------------------------- */
/*  GET /api/kyc/status   (any authenticated user)                             */
/*  Returns the user's own KYC application or null if they haven't submitted. */
/* -------------------------------------------------------------------------- */

export const getKycStatus = asyncHandler(async (req: Request, res: Response) => {
  const kyc = await Kyc.findOne({ userId: req.user!.userId })
  // Decrypt the user's own PII for display; encrypted doc refs are never returned
  // (documents are fetched via the gated signed-URL endpoint).
  res.json({ success: true, data: kyc ? sanitizeKycForOwner(kyc) : null })
})

/* -------------------------------------------------------------------------- */
/*  GET /api/kyc/:id/documents   (protected)                                   */
/*  Mints FRESH, short-lived (5 min) signed download links for the 3 KYC docs. */
/*  Authorized ONLY for the KYC's own user or an admin. Links are generated on  */
/*  demand and never stored — the DB holds only encrypted, non-resolvable refs. */
/* -------------------------------------------------------------------------- */

// Hardcoded field set = an inherent whitelist; no caller-supplied field name is
// ever passed to the signer.
const DOC_FIELDS = ['citizenshipFront', 'citizenshipBack', 'selfieWithId'] as const

export const getKycDocuments = asyncHandler(async (req: Request, res: Response) => {
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

  // Authorize: only the KYC's own applicant, or an admin reviewer. Nobody else —
  // this is the sole path that turns an encrypted ref into a viewable document.
  const isOwner = kyc.userId.toString() === req.user!.userId
  const isAdmin = req.user!.role === 'admin'
  if (!isOwner && !isAdmin) {
    res.status(403).json({ success: false, message: 'Not authorized to view these documents' })
    return
  }

  const TTL_SECONDS = 300
  const documents: Record<string, string> = {}
  for (const field of DOC_FIELDS) {
    try {
      const ref = decryptRef(kyc[field])
      documents[field] = signedKycDownloadUrl(ref, TTL_SECONDS)
    } catch {
      // Legacy/placeholder row that isn't a valid encrypted ref — skip it
      // rather than 500 the whole response.
    }
  }

  res.json({ success: true, data: { documents, expiresInSeconds: TTL_SECONDS } })
})
