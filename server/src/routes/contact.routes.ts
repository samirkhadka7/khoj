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

const router = Router()

// Every contact-request route requires auth — apply once for the whole router
router.use(authMiddleware)

// Static paths first, before any :id route
router.get('/received', listReceived)
router.get('/sent', listSent)

router.post('/', sendContactRequest)

router.patch('/:id/accept', acceptRequest)
router.patch('/:id/reject', rejectRequest)

// CRITICAL — must come AFTER /:id/accept and /:id/reject so Express matches those first
router.get('/:id/contact-info', getContactInfo)

export default router
