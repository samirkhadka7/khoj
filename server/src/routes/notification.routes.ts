import { Router } from 'express'
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../controllers/notification.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const router = Router()

// Every notification route requires auth
router.use(authMiddleware)

// Specific paths first — read-all and unread-count must match before /:id/read
router.get('/unread-count', getUnreadCount)
router.patch('/read-all', markAllAsRead)

router.get('/', listNotifications)
router.patch('/:id/read', markAsRead)

export default router
