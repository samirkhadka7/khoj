import { Router } from 'express'
import {
  register,
  login,
  verifyLoginMfa,
  refresh,
  logout,
  changePassword,
  resetExpiredPassword,
  getMe,
  updateProfile,
  updateProfilePhoto,
} from '../controllers/auth.controller'
import { setupMfa, enableMfa, disableMfa } from '../controllers/mfa.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { upload } from '../middleware/upload.middleware'
import { authLimiter, loginLimiter /* , otpLimiter */ } from '../utils/rateLimit'

const router = Router()

// Apply a baseline rate limit to every /api/auth/* route — register, profile
// updates, etc. The login route layers a stricter per-failure limiter on top.
router.use(authLimiter)

// Public — no token needed
router.post('/register', register)
router.post('/login', loginLimiter, login)
// Step 2 of MFA login — same per-IP failed-attempt limiter as /login so brute
// forcing the 6-digit code shares the existing threshold (no second, inconsistent one).
router.post('/login/mfa', loginLimiter, verifyLoginMfa)

// Refresh — the HttpOnly refresh cookie is the credential (no Bearer token).
// Rotates the token and returns a fresh access token. authLimiter (router-level)
// bounds abuse.
router.post('/refresh', refresh)

// Logout — revokes the session family + clears the cookie. Works off the refresh
// cookie so it succeeds even with an expired access token. No auth required.
router.post('/logout', logout)

// Forced password reset when login returned passwordExpired — the reset token is
// the credential (no Bearer). authLimiter (router-level) bounds abuse.
router.post('/reset-expired-password', resetExpiredPassword)

// Protected — require valid JWT
router.get('/me', authMiddleware, getMe)
router.post('/change-password', authMiddleware, changePassword)
router.put('/profile', authMiddleware, updateProfile)
router.put('/profile-photo', authMiddleware, upload.single('image'), updateProfilePhoto)

// MFA enrollment (all require a valid session — you enroll while logged in).
// setup -> scan QR, enable -> confirm one code + get backup codes, disable -> prove a code.
router.post('/mfa/setup', authMiddleware, setupMfa)
router.post('/mfa/enable', authMiddleware, enableMfa)
router.post('/mfa/disable', authMiddleware, disableMfa)

// TODO Step 14 — Sparrow SMS. Wire `otpLimiter` to /send-otp when implemented:
//   router.post('/send-otp', authMiddleware, otpLimiter, sendOtp)
//   router.post('/verify-otp', authMiddleware, verifyOtp)

export default router
