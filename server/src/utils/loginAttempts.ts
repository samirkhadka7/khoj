/**
 * Per-IP failed-login tracker (Feature 2).
 *
 * Drives "require a CAPTCHA after N failed logins" using the SAME threshold and
 * window as the existing login rate limit (5 failures / 15 min) — no second,
 * inconsistent number. After the threshold, login requires a valid CAPTCHA to
 * proceed (a usable alternative to a hard lockout); a successful login resets it.
 *
 * In-memory + per-instance (fine for this app's single-instance deploy); a shared
 * store (Redis) would be the multi-instance upgrade. Not gated by NODE_ENV — this
 * control is always on, unlike the express-rate-limit dev disable switch.
 */

import crypto from 'crypto'

const WINDOW_MS = 15 * 60 * 1000
export const LOGIN_CAPTCHA_THRESHOLD = 5

interface Entry {
  count: number
  firstAt: number
}

const attempts = new Map<string, Entry>()
const key = (ip?: string): string => ip || 'unknown'
const isExpired = (e: Entry): boolean => Date.now() - e.firstAt > WINDOW_MS

export const recordLoginFailure = (ip?: string): void => {
  const k = key(ip)
  const e = attempts.get(k)
  if (!e || isExpired(e)) attempts.set(k, { count: 1, firstAt: Date.now() })
  else e.count += 1
}

export const resetLoginAttempts = (ip?: string): void => {
  attempts.delete(key(ip))
}

/** True once this IP has hit the failed-attempt threshold within the window. */
export const isCaptchaRequiredForLogin = (ip?: string): boolean => {
  const e = attempts.get(key(ip))
  if (!e || isExpired(e)) return false
  return e.count >= LOGIN_CAPTCHA_THRESHOLD
}

/* -------------------------------------------------------------------------- */
/*  Per-mfaToken attempt cap (Feature 2/C4)                                     */
/*  Closes the audit gap: repeated wrong-code guesses against the SAME mfaToken. */
/*  The per-IP loginLimiter still applies; this adds a per-token cap so a single */
/*  challenge can't be brute-forced. Keyed by a hash of the token (never stored  */
/*  raw). The mfaToken lives ~5 min, so this window is a little longer.          */
/* -------------------------------------------------------------------------- */

const MFA_WINDOW_MS = 10 * 60 * 1000
export const MFA_ATTEMPT_LIMIT = 5

const mfaAttempts = new Map<string, Entry>()
const mfaKey = (mfaToken: string): string =>
  crypto.createHash('sha256').update(mfaToken).digest('hex')
const isMfaExpired = (e: Entry): boolean => Date.now() - e.firstAt > MFA_WINDOW_MS

export const recordMfaFailure = (mfaToken: string): void => {
  const k = mfaKey(mfaToken)
  const e = mfaAttempts.get(k)
  if (!e || isMfaExpired(e)) mfaAttempts.set(k, { count: 1, firstAt: Date.now() })
  else e.count += 1
}

export const mfaAttemptsExceeded = (mfaToken: string): boolean => {
  const e = mfaAttempts.get(mfaKey(mfaToken))
  if (!e || isMfaExpired(e)) return false
  return e.count >= MFA_ATTEMPT_LIMIT
}

export const clearMfaAttempts = (mfaToken: string): void => {
  mfaAttempts.delete(mfaKey(mfaToken))
}

// Periodic sweep so the maps can't grow unbounded. unref() so it never keeps the
// process alive on its own.
setInterval(() => {
  for (const [k, e] of attempts) if (isExpired(e)) attempts.delete(k)
  for (const [k, e] of mfaAttempts) if (isMfaExpired(e)) mfaAttempts.delete(k)
}, WINDOW_MS).unref()
