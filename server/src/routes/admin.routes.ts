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

const router = Router()

// Every admin route requires BOTH auth and admin role — apply once for the whole router
router.use(authMiddleware, requireRole('admin'))

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
