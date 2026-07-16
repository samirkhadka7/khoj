import type { Request, Response, NextFunction, RequestHandler } from 'express'
import type { UserRole } from '../types'

/**
 * Restrict a route to one or more roles.
 * Must be used AFTER authMiddleware so `req.user` is populated.
 *
 *   router.get('/admin/users', authMiddleware, requireRole('admin'), listUsers)
 *   router.post('/listings', authMiddleware, requireRole('owner', 'admin'), createListing)
 */
export const requireRole = (...allowed: UserRole[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' })
      return
    }

    if (!allowed.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden — requires role: ${allowed.join(' or ')}`,
      })
      return
    }

    next()
  }
}
