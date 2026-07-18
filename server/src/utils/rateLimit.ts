import rateLimit, { type Options } from 'express-rate-limit'
import type { Request, Response } from 'express'

/**
 * Centralized rate limiters.
 *
 * Behavior:
 *   - Per-IP buckets (IPv4 + IPv6).
 *   - Standard `RateLimit-*` headers + `Retry-After` on 429.
 *   - Failed-only counting on the login limiter (successful logins don't burn
 *     attempts) so a user typing the right password 100 times in a row isn't
 *     locked out.
 *   - ON EVERYWHERE by default, including dev (Feature 2/C). The old
 *     "off unless NODE_ENV==='production'" default meant the default dev/demo run
 *     had NO throttling — that was the actual vulnerability, not a convenience.
 *   - Only an EXPLICIT opt-out disables it (for one-off local debugging), via
 *     RATE_LIMIT_ENABLED=false or RATE_LIMIT_DISABLED=true.
 */

const isDisabled = (): boolean => {
  // Explicit opt-out only — never the default. Used to silence the limiter for a
  // one-off local debugging session; production must never set these.
  if (process.env.RATE_LIMIT_ENABLED === 'false') return true
  if (process.env.RATE_LIMIT_DISABLED === 'true') return true
  // Default: ENABLED, in every environment.
  return false
}

const buildHandler = (humanWindow: string) =>
  ((_req: Request, res: Response) => {
    // express-rate-limit sets Retry-After (seconds). Convert to minutes for the
    // user-facing message; round up so "59s remaining" doesn't render as 0 min.
    const retryAfterSec = Number(res.getHeader('Retry-After') || 0)
    const minutes = Math.max(1, Math.ceil(retryAfterSec / 60))
    res.status(429).json({
      success: false,
      message: `Too many attempts, try again in ${minutes} minute${
        minutes === 1 ? '' : 's'
      }. (limit window: ${humanWindow})`,
    })
  }) as Options['handler']

/**
 * Login limiter — 5 failed logins per IP per 15 minutes.
 * Successful logins don't count, so legitimate users typing slowly are fine.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  // Only count requests that hit a 4xx/5xx — successful logins (2xx) skip
  skipSuccessfulRequests: true,
  handler: buildHandler('15 minutes'),
  skip: isDisabled,
})

/**
 * OTP limiter — 3 OTP requests per IP per hour.
 * Wired here for when Sparrow SMS goes live (Step 14). Keeps SMS bills bounded.
 */
export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildHandler('1 hour'),
  skip: isDisabled,
})

/**
 * General-purpose auth limiter — 30 requests / 15 min on any /api/auth/* route
 * (register, profile updates, etc.). Catches scripted enumeration that doesn't
 * trigger the login-specific bucket.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: buildHandler('15 minutes'),
  skip: isDisabled,
})

/* -------------------------------------------------------------------------- */
/*  General-purpose limiters for the rest of the API (Feature 2/C).            */
/*  Per-route thresholds — a browse endpoint is generous, a mutation is tight,  */
/*  but nothing is unlimited.                                                   */
/* -------------------------------------------------------------------------- */

const createLimiter = (max: number, humanWindow = '15 minutes', windowMs = 15 * 60 * 1000) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: buildHandler(humanWindow),
    skip: isDisabled,
  })

/** Read-heavy routers (listings, messages, notifications, review reads). */
export const generalLimiter = createLimiter(200)
/** Mutations that shouldn't be spammed (contact-request send, review create, listing writes). */
export const writeLimiter = createLimiter(30)
/** Sensitive low-volume writes (KYC submission). */
export const strictLimiter = createLimiter(10)
/** Admin panel — moderate cap across all admin actions. */
export const adminLimiter = createLimiter(150)
