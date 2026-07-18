import { Router } from 'express'
import { listMessages, markChatRead } from '../controllers/message.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { generalLimiter } from '../utils/rateLimit'

const router = Router()
router.use(generalLimiter)
router.use(authMiddleware)

router.get('/:contactRequestId', listMessages)
router.patch('/:contactRequestId/read', markChatRead)

export default router
