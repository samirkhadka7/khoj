import { Router } from 'express'
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../controllers/notification.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { generalLimiter } from '../utils/rateLimit'

const router = Router()

// Per-IP cap (the bell polls these, so a general/generous limit).
router.use(generalLimiter)

// Every notification route requires auth
router.use(authMiddleware)

// Specific paths first — read-all and unread-count must match before /:id/read
router.get('/unread-count', getUnreadCount)
router.patch('/read-all', markAllAsRead)

router.get('/', listNotifications)
router.patch('/:id/read', markAsRead)

export default router
