import { Router } from 'express'
import {
  getStats,
  listPendingVerifications,
  verifyListing,
  unverifyListing,
  listReportedListings,
  listUsers,
  banUser,
  unbanUser,
  listKyc,
  approveKyc,
  rejectKyc,
} from '../controllers/admin.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'
import { requireMfaForPrivileged } from '../middleware/mfa.middleware'
import { adminLimiter } from '../utils/rateLimit'

const router = Router()

// Per-IP cap on all admin traffic (before auth, so floods are capped regardless).
router.use(adminLimiter)

// Every admin route requires auth + admin role + MFA enabled. Admin actions are
// the highest-impact surface (KYC approval, bans), so the whole router — reads
// included, since the KYC queue and user list are sensitive PII — is MFA-gated.
router.use(authMiddleware, requireRole('admin'), requireMfaForPrivileged)

// ---- Dashboard ----
router.get('/stats', getStats)

// ---- Listings moderation ----
router.get('/listings/pending', listPendingVerifications)
router.patch('/listings/:id/verify', verifyListing)
router.patch('/listings/:id/unverify', unverifyListing)

// ---- Reports ----
router.get('/reports', listReportedListings)

// ---- Users moderation ----
router.get('/users', listUsers)
router.patch('/users/:id/ban', banUser)
router.patch('/users/:id/unban', unbanUser)

// ---- KYC review ----
router.get('/kyc', listKyc)
router.patch('/kyc/:id/approve', approveKyc)
router.patch('/kyc/:id/reject', rejectKyc)

export default router
