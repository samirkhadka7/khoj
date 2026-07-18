import { Router } from 'express'
import {
  sendContactRequest,
  listReceived,
  listSent,
  acceptRequest,
  rejectRequest,
  getContactInfo,
} from '../controllers/contact.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { generalLimiter, writeLimiter } from '../utils/rateLimit'

const router = Router()

// Per-IP cap on all contact-request traffic; sending layers a tighter writeLimiter.
router.use(generalLimiter)

// Every contact-request route requires auth — apply once for the whole router
router.use(authMiddleware)

// Static paths first, before any :id route
router.get('/received', listReceived)
router.get('/sent', listSent)

// Sending is the spam vector — tighter cap.
router.post('/', writeLimiter, sendContactRequest)

router.patch('/:id/accept', acceptRequest)
router.patch('/:id/reject', rejectRequest)

// CRITICAL — must come AFTER /:id/accept and /:id/reject so Express matches those first
router.get('/:id/contact-info', getContactInfo)

export default router
