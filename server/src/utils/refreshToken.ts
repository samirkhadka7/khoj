import crypto from 'crypto'

/**
 * Primitives for refresh-token rotation (Feature 5).
 *
 * The raw refresh token is a 256-bit random secret handed to the client in an
 * HttpOnly cookie. Server-side we persist only its SHA-256 hash (see Session
 * model) — so a database leak cannot be replayed. Because the token is
 * high-entropy random, a fast hash (SHA-256) is the right choice: no
 * brute-force risk, and refresh lookups stay indexed and fast (bcrypt would be
 * both unnecessary and too slow to look up by).
 */

/** A fresh, high-entropy refresh token (base64url, ~43 chars). Sent to the client. */
export const generateRefreshToken = (): string => crypto.randomBytes(32).toString('base64url')

/** SHA-256 hash used as the stored/lookup form of a refresh token. */
export const hashToken = (raw: string): string =>
  crypto.createHash('sha256').update(raw).digest('hex')

/** SHA-256 of the User-Agent — the device-binding fingerprint compared on refresh. */
export const hashUserAgent = (ua: string | undefined | null): string =>
  crypto.createHash('sha256').update((ua || 'unknown').trim()).digest('hex')

/** New session-family id (stable across rotations within one login). */
export const newFamilyId = (): string => crypto.randomUUID()

/** Refresh-token lifetime in ms (env-overridable, default 30 days). */
export const refreshTokenTtlMs = (): number => {
  const days = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS) || 30
  return days * 24 * 60 * 60 * 1000
}

/** Absolute expiry Date for a newly-issued refresh token. */
export const refreshTokenExpiryDate = (): Date => new Date(Date.now() + refreshTokenTtlMs())
