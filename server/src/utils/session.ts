import type { Request, Response } from 'express'
import type { HydratedDocument } from 'mongoose'
import { Session, type ISession } from '../models'
import {
  generateRefreshToken,
  hashToken,
  hashUserAgent,
  newFamilyId,
  refreshTokenExpiryDate,
  refreshTokenTtlMs,
} from './refreshToken'

/**
 * Refresh-token cookie + session lifecycle helpers (Feature 5).
 *
 * The refresh token lives ONLY in an HttpOnly cookie (never in JS), so XSS can't
 * read it. It is Secure + SameSite=Strict and scoped to `/api/auth`, so the
 * browser only ever sends it to the auth endpoints (refresh/logout).
 */

const COOKIE_NAME = 'refreshToken'
const isProd = (): boolean => process.env.NODE_ENV === 'production'

// `secure` is off in dev so the cookie sets over http://localhost; on in prod.
const cookieOptions = () => ({
  httpOnly: true,
  secure: isProd(),
  sameSite: 'strict' as const,
  path: '/api/auth',
  maxAge: refreshTokenTtlMs(),
})

const setRefreshCookie = (res: Response, raw: string): void => {
  res.cookie(COOKIE_NAME, raw, cookieOptions())
}

export const clearRefreshCookie = (res: Response): void => {
  // clearCookie must match path/attributes to actually delete the cookie.
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: isProd(), sameSite: 'strict', path: '/api/auth' })
}

export const readRefreshCookie = (req: Request): string | undefined =>
  (req.cookies as Record<string, string> | undefined)?.[COOKIE_NAME]

/**
 * Start a NEW session family and set the refresh cookie. Called at login and at
 * MFA-login (i.e. whenever a fresh access token is first issued).
 */
export const issueSession = async (userId: string, req: Request, res: Response): Promise<void> => {
  const raw = generateRefreshToken()
  await Session.create({
    userId,
    familyId: newFamilyId(),
    tokenHash: hashToken(raw),
    userAgentHash: hashUserAgent(req.headers['user-agent']),
    expiresAt: refreshTokenExpiryDate(),
  })
  setRefreshCookie(res, raw)
}

/**
 * Rotate: mark the presented token used and mint a new one in the SAME family,
 * then set the new cookie. The UA fingerprint carries over from the current row.
 */
export const rotateSession = async (
  current: HydratedDocument<ISession>,
  res: Response
): Promise<void> => {
  current.usedAt = new Date()
  await current.save()

  const raw = generateRefreshToken()
  await Session.create({
    userId: current.userId,
    familyId: current.familyId,
    tokenHash: hashToken(raw),
    userAgentHash: current.userAgentHash,
    expiresAt: refreshTokenExpiryDate(),
  })
  setRefreshCookie(res, raw)
}

/**
 * Revoke every token in a family — used on logout and on reuse-detection (theft):
 * if one rotated/revoked token is replayed, the whole family dies.
 */
export const revokeFamily = async (familyId: string): Promise<void> => {
  await Session.updateMany({ familyId }, { $set: { revokedAt: new Date() } })
}
