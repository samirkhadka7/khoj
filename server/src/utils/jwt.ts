import jwt, { type Secret, type SignOptions } from 'jsonwebtoken'
import type { UserRole } from '../types'

/**
 * JWT payload — kept tiny on purpose.
 * Only userId + role go in the token. Anything else (name, email, etc.)
 * is fetched fresh from the DB on each request via /me — that way a banned/edited
 * user can't keep using a still-valid token from before the change.
 */
export interface JwtPayload {
  userId: string
  role: UserRole
}

const getSecret = (): Secret => {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET is not defined in .env')
  return s
}

export const signToken = (payload: JwtPayload): string => {
  // Cast keeps us compatible across @types/jsonwebtoken minor versions
  // (some versions tighten `expiresIn` to a branded StringValue type)
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  }
  return jwt.sign(payload, getSecret(), options)
}

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, getSecret()) as JwtPayload
}
