import { Router } from 'express'
import { submitKyc, getKycStatus, getKycDocuments } from '../controllers/kyc.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireMfaForPrivileged } from '../middleware/mfa.middleware'
import { kycUpload } from '../middleware/upload.middleware'

const router = Router()

// All KYC routes require auth — user submitting is always logged in
router.use(authMiddleware)

router.get('/status', getKycStatus)

// Signed, short-lived document links — owner-or-admin gating enforced in the
// controller. Also MFA-gated: viewing citizenship documents is at least as
// sensitive as the admin/owner actions already behind requireMfaForPrivileged,
// so owner/admin callers must have MFA enabled (a pre-approval 'user' viewing
// their own docs passes through). Registered after '/status' so it matches first.
router.get('/:id/documents', requireMfaForPrivileged, getKycDocuments)

// 3 distinct file fields, parsed by multer.fields()
router.post(
  '/submit',
  kycUpload.fields([
    { name: 'citizenshipFront', maxCount: 1 },
    { name: 'citizenshipBack', maxCount: 1 },
    { name: 'selfieWithId', maxCount: 1 },
  ]),
  submitKyc
)

export default router
