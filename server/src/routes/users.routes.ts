import { Router } from 'express'
import { exportMyData, importMyData } from '../controllers/users.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { strictLimiter, writeLimiter } from '../utils/rateLimit'

const router = Router()

// All /api/users routes require a valid session.
router.use(authMiddleware)

// Bulk data export — tightly rate-limited (strictLimiter) as a heavy operation.
router.get('/me/export', strictLimiter, exportMyData)

// Re-import the whitelisted profile fields only.
router.post('/me/import', writeLimiter, importMyData)

export default router
