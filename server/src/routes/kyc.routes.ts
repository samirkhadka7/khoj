import { Router } from 'express'
import { submitKyc, getKycStatus } from '../controllers/kyc.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { kycUpload } from '../middleware/upload.middleware'

const router = Router()

// All KYC routes require auth — user submitting is always logged in
router.use(authMiddleware)

router.get('/status', getKycStatus)

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
