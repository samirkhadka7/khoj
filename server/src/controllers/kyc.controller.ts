import type { Request, Response } from 'express'
import { Kyc, User } from '../models'
import { asyncHandler } from '../utils/asyncHandler'
import { deleteManyFromCloudinary, uploadToCloudinary } from '../utils/cloudinary'

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

  // Upload all three documents to Cloudinary in parallel.
  // Folder is per-user so it's easy to find and audit.
  const [frontUrl, backUrl, selfieUrl] = await Promise.all([
    uploadToCloudinary(front, `baskhoj/kyc/${req.user!.userId}`),
    uploadToCloudinary(back, `baskhoj/kyc/${req.user!.userId}`),
    uploadToCloudinary(selfie, `baskhoj/kyc/${req.user!.userId}`),
  ])

  if (existing) {
    // Resubmit after rejection — overwrite the existing doc and reset status.
    // Snapshot the OLD doc URLs before mutating, then async-delete after save.
    const oldUrls = [
      existing.citizenshipFront,
      existing.citizenshipBack,
      existing.selfieWithId,
    ]

    existing.legalName = legalName.trim()
    existing.phone = phone.trim()
    existing.address = { district: district.trim(), area: area.trim() }
    existing.citizenshipFront = frontUrl
    existing.citizenshipBack = backUrl
    existing.selfieWithId = selfieUrl
    existing.status = 'pending'
    existing.rejectionReason = undefined
    existing.reviewedBy = undefined
    existing.reviewedAt = undefined
    existing.submittedAt = new Date()
    await existing.save()

    // Old docs (from the rejected submission) may still exist on Cloudinary if
    // the reject flow didn't run — clean them now to be safe.
    void deleteManyFromCloudinary(oldUrls)

    res.status(200).json({ success: true, data: existing })
    return
  }

  const kyc = await Kyc.create({
    userId: req.user!.userId,
    legalName: legalName.trim(),
    phone: phone.trim(),
    address: { district: district.trim(), area: area.trim() },
    citizenshipFront: frontUrl,
    citizenshipBack: backUrl,
    selfieWithId: selfieUrl,
    status: 'pending',
    submittedAt: new Date(),
  })

  // Sync the user's phone if they didn't have one yet
  await User.updateOne(
    { _id: req.user!.userId, $or: [{ phone: { $exists: false } }, { phone: '' }] },
    { $set: { phone: phone.trim() } }
  )

  res.status(201).json({ success: true, data: kyc })
})

/* -------------------------------------------------------------------------- */
/*  GET /api/kyc/status   (any authenticated user)                             */
/*  Returns the user's own KYC application or null if they haven't submitted. */
/* -------------------------------------------------------------------------- */

export const getKycStatus = asyncHandler(async (req: Request, res: Response) => {
  const kyc = await Kyc.findOne({ userId: req.user!.userId })
  res.json({ success: true, data: kyc })
})
