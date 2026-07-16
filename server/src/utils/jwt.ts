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
  const payload = jwt.verify(token, getSecret()) as JwtPayload & { purpose?: string }
  // Reject the short-lived MFA-challenge token here: it is signed with the same
  // secret but only authorizes the second login step, NOT a full session. Without
  // this check it could be presented as a Bearer session token (with no role).
  if (payload.purpose === 'mfa') {
    throw new Error('MFA challenge token cannot be used as a session token')
  }
  return payload
}

/* -------------------------------------------------------------------------- */
/*  MFA challenge token — issued after a correct password when MFA is on.      */
/*  It is short-lived and single-purpose: it ONLY authorizes POST /login/mfa,  */
/*  and is rejected everywhere a real session token is expected (see above).   */
/* -------------------------------------------------------------------------- */
export interface MfaChallengePayload {
  userId: string
  purpose: 'mfa'
}

export const signMfaChallenge = (userId: string): string => {
  const options: SignOptions = { expiresIn: '5m' } // just long enough to type a code
  return jwt.sign({ userId, purpose: 'mfa' }, getSecret(), options)
}

export const verifyMfaChallenge = (token: string): MfaChallengePayload => {
  const payload = jwt.verify(token, getSecret()) as MfaChallengePayload
  if (payload.purpose !== 'mfa') {
    throw new Error('Not an MFA challenge token')
  }
  return payload
}
