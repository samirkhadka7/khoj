import type { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { User, type IUser } from '../models'
import { signToken } from '../utils/jwt'
import { asyncHandler } from '../utils/asyncHandler'
import { deleteFromCloudinary, uploadToCloudinary } from '../utils/cloudinary'

const SALT_ROUNDS = 10

/**
 * Strips sensitive fields before returning a user to the client.
 * passwordHash is already hidden by `select: false` on the schema, but this
 * is the second line of defense in case someone forgets `.select('+passwordHash')`
 * was used and accidentally returns the document directly.
 */
const sanitizeUser = (u: IUser) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  phone: u.phone,
  isPhoneVerified: u.isPhoneVerified,
  profilePhoto: u.profilePhoto,
  bio: u.bio,
  isVerified: u.isVerified,
  createdAt: u.createdAt,
})

/* -------------------------------------------------------------------------- */
/*  POST /api/auth/register                                                   */
/* -------------------------------------------------------------------------- */

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, phone } = req.body as {
    name?: string
    email?: string
    password?: string
    phone?: string
  }

  // Basic input validation — keep it simple, no validation library needed yet
  if (!name || !email || !password) {
    res.status(400).json({ success: false, message: 'name, email, and password are required' })
    return
  }

  if (password.length < 6) {
    res.status(400).json({ success: false, message: 'Password must be at least 6 characters' })
    return
  }

  // EVERYONE registers as 'user'. Owner role is granted later via admin KYC approval.
  // The `role` field is intentionally NOT read from req.body — clients can't self-promote.
  const safeRole = 'user' as const

  const normalizedEmail = email.toLowerCase().trim()

  const existing = await User.findOne({ email: normalizedEmail })
  if (existing) {
    res.status(409).json({ success: false, message: 'Email already registered' })
    return
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: safeRole,
    // Phone is optional at register but the new form prompts for it.
    // The schema's regex enforces format if provided.
    ...(phone && phone.trim() ? { phone: phone.trim() } : {}),
  })

  const token = signToken({ userId: user._id.toString(), role: user.role })

  res.status(201).json({
    success: true,
    data: { token, user: sanitizeUser(user) },
  })
})

/* -------------------------------------------------------------------------- */
/*  POST /api/auth/login                                                      */
/* -------------------------------------------------------------------------- */

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string }

  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email and password are required' })
    return
  }

  // Schema sets `select: false` on passwordHash, so we have to opt in here
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash')

  if (!user) {
    // Don't tell the client whether email or password was wrong — prevents email enumeration
    res.status(401).json({ success: false, message: 'Invalid credentials' })
    return
  }

  if (user.isBanned) {
    res.status(403).json({ success: false, message: 'This account has been banned' })
    return
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash)
  if (!passwordMatches) {
    res.status(401).json({ success: false, message: 'Invalid credentials' })
    return
  }

  const token = signToken({ userId: user._id.toString(), role: user.role })

  res.json({
    success: true,
    data: { token, user: sanitizeUser(user) },
  })
})

/* -------------------------------------------------------------------------- */
/*  GET /api/auth/me  (protected)                                             */
/* -------------------------------------------------------------------------- */

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  // authMiddleware guarantees req.user, but TS doesn't know that — non-null assert
  const user = await User.findById(req.user!.userId)

  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' })
    return
  }

  res.json({ success: true, data: sanitizeUser(user) })
})

/* -------------------------------------------------------------------------- */
/*  PUT /api/auth/profile  (protected)                                        */
/*  Note: profile photo upload comes later (Step 4 — Cloudinary).             */
/* -------------------------------------------------------------------------- */

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const { name, bio, phone } = req.body as { name?: string; bio?: string; phone?: string }

  // Whitelist exactly which fields can be updated here.
  // Never allow role / email / isVerified / isBanned to be changed via this endpoint.
  const updates: Partial<Pick<IUser, 'name' | 'bio' | 'phone'>> = {}
  if (typeof name === 'string') updates.name = name.trim()
  if (typeof bio === 'string') updates.bio = bio.trim()
  if (typeof phone === 'string') updates.phone = phone.trim()

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ success: false, message: 'No valid fields to update' })
    return
  }

  const user = await User.findByIdAndUpdate(req.user!.userId, updates, {
    new: true, // return the updated doc, not the old one
    runValidators: true, // re-run schema validators (e.g. phone format)
  })

  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' })
    return
  }

  res.json({ success: true, data: sanitizeUser(user) })
})

/* -------------------------------------------------------------------------- */
/*  PUT /api/auth/profile-photo  (protected, multipart)                       */
/*  multer parses a single file in field "image" (max 5MB).                   */
/* -------------------------------------------------------------------------- */

export const updateProfilePhoto = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file
  if (!file) {
    res.status(400).json({ success: false, message: 'No image uploaded' })
    return
  }

  // Snapshot the OLD photo url BEFORE the update so we can delete it after.
  // Read first; if the user doesn't exist we 404 without uploading.
  const existing = await User.findById(req.user!.userId).select('profilePhoto')
  if (!existing) {
    res.status(404).json({ success: false, message: 'User not found' })
    return
  }
  const oldPhoto = existing.profilePhoto

  const url = await uploadToCloudinary(file, 'baskhoj/profiles')

  const user = await User.findByIdAndUpdate(
    req.user!.userId,
    { profilePhoto: url },
    { new: true }
  )

  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' })
    return
  }

  // Fire-and-forget — user already sees the new photo, old one cleans up async
  if (oldPhoto && oldPhoto !== url) void deleteFromCloudinary(oldPhoto)

  res.json({ success: true, data: sanitizeUser(user) })
})
