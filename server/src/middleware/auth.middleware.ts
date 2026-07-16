import type { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'

/**
 * Verifies JWT from `Authorization: Bearer <token>` header
 * and attaches the decoded payload to `req.user`.
 *
 * Use on every protected route:
 *   router.get('/me', authMiddleware, getMe)
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'No token provided' })
    return
  }

  const token = header.slice(7).trim()

  try {
    const payload = verifyToken(token)
    req.user = payload
    next()
  } catch {
    // Catches both invalid signature and expired token — message is intentionally
    // generic so a 401 doesn't leak which one it was
    res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }
}
