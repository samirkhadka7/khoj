import { User } from '../models'
import { asyncHandler } from '../utils/asyncHandler'

/**
 * Enforce MFA for privileged roles (owner, admin) on sensitive actions.
 *
 * Rationale: owner/admin takeover is the highest-impact case (owner sees tenant
 * PII on accepted contact requests; admin approves KYC and can ban users), so
 * the coursework requires MFA for these roles at minimum. `user` accounts are
 * NOT forced — MFA is optional/encouraged for them.
 *
 * Placement matters:
 *   - Use this AFTER authMiddleware (needs req.user) and typically after
 *     requireRole, on the PRIVILEGED ACTION routes (writes / admin operations).
 *   - Do NOT put it on /api/auth/mfa/* — that would be a chicken-and-egg lock:
 *     an owner could never enroll. Those endpoints stay reachable with just a
 *     valid session, so a privileged user can always log in, hit /me, and enroll.
 *
 * A blocked request returns 403 with code 'MFA_REQUIRED' so the client can route
 * the user into the enrollment flow instead of showing a generic error.
 */
export const requireMfaForPrivileged = asyncHandler(async (req, res, next) => {
  const role = req.user!.role

  // Only owner/admin are compelled to use MFA. Everyone else passes through.
  if (role !== 'owner' && role !== 'admin') {
    next()
    return
  }

  // Fresh read (don't trust a possibly-stale token) — mfaEnabled is the source of truth.
  const user = await User.findById(req.user!.userId).select('mfaEnabled')
  if (!user) {
    res.status(401).json({ success: false, message: 'User not found' })
    return
  }

  if (!user.mfaEnabled) {
    res.status(403).json({
      success: false,
      code: 'MFA_REQUIRED',
      message:
        'MFA must be enabled on owner/admin accounts before performing this action. Enroll via /api/auth/mfa/setup.',
    })
    return
  }

  next()
})
