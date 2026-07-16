import { Router } from 'express'
import { listMessages, markChatRead } from '../controllers/message.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const router = Router()
router.use(authMiddleware)

router.get('/:contactRequestId', listMessages)
router.patch('/:contactRequestId/read', markChatRead)

export default router
