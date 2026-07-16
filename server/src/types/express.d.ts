import type { JwtPayload } from '../utils/jwt'

/**
 * Augments Express's Request type with `req.user`, populated by authMiddleware.
 * Must remain a `.d.ts` file with `export {}` so TS treats it as a module
 * but still applies the global declaration.
 */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export {}
