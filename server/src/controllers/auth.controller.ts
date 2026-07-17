import type { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { User, Session, type IUser } from '../models'
import { signToken, signMfaChallenge, verifyMfaChallenge } from '../utils/jwt'
import { asyncHandler } from '../utils/asyncHandler'
import { deleteFromCloudinary, uploadToCloudinary } from '../utils/cloudinary'
import { decrypt } from '../utils/crypto'
import { verifyTotp, matchAndConsumeBackupCode } from '../utils/mfa'
import { hashToken, hashUserAgent } from '../utils/refreshToken'
import {
  issueSession,
  rotateSession,
  revokeFamily,
  readRefreshCookie,
  clearRefreshCookie,
} from '../utils/session'

// owner/admin are privileged roles that MUST use MFA. This flag tells the client
// to push them into enrollment when they log in without MFA on yet.
const mfaSetupRequired = (u: Pick<IUser, 'role' | 'mfaEnabled'>): boolean =>
  (u.role === 'owner' || u.role === 'admin') && !u.mfaEnabled

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
  // Expose only whether MFA is on — never the secret or backup codes.
  mfaEnabled: u.mfaEnabled,
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

  // --- MFA gate (Feature 1) ---
  // If MFA is enabled, the password alone is NOT enough. We withhold the session
  // token and return a short-lived challenge token; the client must complete
  // POST /api/auth/login/mfa with a valid code to actually get a session.
  if (user.mfaEnabled) {
    const mfaToken = signMfaChallenge(user._id.toString())
    res.json({ success: true, data: { mfaRequired: true, mfaToken } })
    return
  }

  const token = signToken({ userId: user._id.toString(), role: user.role })
  // Start a session family + set the HttpOnly refresh cookie (Feature 5).
  await issueSession(user._id.toString(), req, res)

  res.json({
    success: true,
    // mfaSetupRequired nudges privileged (owner/admin) users to enroll.
    data: { token, user: sanitizeUser(user), mfaSetupRequired: mfaSetupRequired(user) },
  })
})

/* -------------------------------------------------------------------------- */
/*  POST /api/auth/login/mfa                                                   */
/*  Step 2 of MFA login: exchange a valid TOTP/backup code + the challenge     */
/*  token for a real session token.                                           */
/* -------------------------------------------------------------------------- */

export const verifyLoginMfa = asyncHandler(async (req: Request, res: Response) => {
  const { mfaToken, code } = req.body as { mfaToken?: string; code?: string }
  if (!mfaToken || !code) {
    res.status(400).json({ success: false, message: 'mfaToken and code are required' })
    return
  }

  // The challenge token proves the password step was just passed (and expires in
  // ~5 min). Reject anything that isn't a valid, unexpired MFA challenge.
  let userId: string
  try {
    userId = verifyMfaChallenge(mfaToken).userId
  } catch {
    res.status(401).json({ success: false, message: 'MFA session expired — please log in again' })
    return
  }

  const user = await User.findById(userId).select('+mfaSecret +mfaBackupCodes')
  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    res.status(401).json({ success: false, message: 'MFA is not active for this account' })
    return
  }
  // Re-check the ban here too — status could have changed since the password step.
  if (user.isBanned) {
    res.status(403).json({ success: false, message: 'This account has been banned' })
    return
  }

  // Accept a live TOTP code OR an unused single-use backup code.
  const totpOk = await verifyTotp(code, decrypt(user.mfaSecret))
  const backupIdx = totpOk ? -1 : await matchAndConsumeBackupCode(code, user.mfaBackupCodes)
  if (!totpOk && backupIdx === -1) {
    res.status(401).json({ success: false, message: 'Invalid authentication code' })
    return
  }

  // Persist the consumed backup code so it can't be reused.
  if (backupIdx !== -1) {
    user.markModified('mfaBackupCodes')
    await user.save()
  }

  const token = signToken({ userId: user._id.toString(), role: user.role })
  // Second factor passed — now issue the session + refresh cookie (Feature 5).
  await issueSession(user._id.toString(), req, res)
  res.json({
    success: true,
    data: { token, user: sanitizeUser(user), usedBackupCode: backupIdx !== -1 },
  })
})

/* -------------------------------------------------------------------------- */
/*  POST /api/auth/refresh                                                     */
/*  The refresh cookie is the credential (no Bearer token). Validates it       */
/*  against the Session store, ROTATES it, and returns a fresh access token.   */
/*  Reuse of an already-rotated/revoked token = theft -> revoke the family.    */
/* -------------------------------------------------------------------------- */

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const raw = readRefreshCookie(req)
  if (!raw) {
    res.status(401).json({ success: false, message: 'No refresh token' })
    return
  }

  const session = await Session.findOne({ tokenHash: hashToken(raw) })
  if (!session) {
    // Unknown/forged token (or already TTL-cleaned). Nothing to rotate.
    clearRefreshCookie(res)
    res.status(401).json({ success: false, message: 'Invalid session' })
    return
  }

  // Reuse detection: a token that was already rotated (usedAt) or revoked being
  // presented again is a theft signal — kill the entire family.
  if (session.usedAt || session.revokedAt) {
    await revokeFamily(session.familyId)
    clearRefreshCookie(res)
    res.status(401).json({ success: false, message: 'Session reuse detected — please log in again' })
    return
  }

  if (session.expiresAt.getTime() < Date.now()) {
    clearRefreshCookie(res)
    res.status(401).json({ success: false, message: 'Session expired — please log in again' })
    return
  }

  // Device binding: the refresh must arrive from the same client the session was
  // created on. An exact User-Agent hash mismatch is treated as a possible
  // stolen-cookie replay from another device -> revoke the family and refuse.
  // (Trade-off: a browser auto-update changes the UA string, so the next refresh
  // is rejected and the user must log in again — the accepted cost of UA binding.)
  if (hashUserAgent(req.headers['user-agent']) !== session.userAgentHash) {
    await revokeFamily(session.familyId)
    clearRefreshCookie(res)
    res.status(401).json({ success: false, message: 'Session device mismatch — please log in again' })
    return
  }

  // Fetch the user fresh — never trust stale state; reject banned/deleted.
  const user = await User.findById(session.userId)
  if (!user || user.isBanned) {
    await revokeFamily(session.familyId)
    clearRefreshCookie(res)
    res.status(401).json({ success: false, message: 'Account not available' })
    return
  }

  // Rotate the refresh token (marks this one used, mints a new one + cookie).
  await rotateSession(session, res)

  const token = signToken({ userId: user._id.toString(), role: user.role })
  res.json({ success: true, data: { token } })
})

/* -------------------------------------------------------------------------- */
/*  POST /api/auth/logout                                                      */
/*  Explicit server-side invalidation: revokes the whole session family and    */
/*  clears the cookie. Works off the refresh cookie (no Bearer needed), so it   */
/*  succeeds even if the access token has already expired. Idempotent.         */
/* -------------------------------------------------------------------------- */

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const raw = readRefreshCookie(req)
  if (raw) {
    const session = await Session.findOne({ tokenHash: hashToken(raw) })
    // Revoke the family so no rotation of this session can be refreshed again.
    if (session) await revokeFamily(session.familyId)
  }
  // Always clear the cookie and return success — don't reveal whether the token
  // was known, and make repeated logouts safe.
  clearRefreshCookie(res)
  res.json({ success: true, message: 'Logged out' })
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
