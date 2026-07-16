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
 *   - ENABLED ONLY in production. In dev/test we'd burn through the bucket
 *     during normal coding (typo your password 5× while testing? locked out
 *     for 15min). Production deploys set NODE_ENV=production, so prod traffic
 *     gets the protection without the dev pain.
 *   - Override either way via RATE_LIMIT_ENABLED=true / RATE_LIMIT_DISABLED=true.
 */

const isDisabled = (): boolean => {
  // Manual force-on (override the dev default for testing the limiter itself)
  if (process.env.RATE_LIMIT_ENABLED === 'true') return false
  // Manual force-off (override prod for one-shot diagnostics)
  if (process.env.RATE_LIMIT_DISABLED === 'true') return true
  // Default: ON in production, OFF everywhere else
  return process.env.NODE_ENV !== 'production'
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
