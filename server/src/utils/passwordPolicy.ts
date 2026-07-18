/**
 * Server-side password policy (Feature 3).
 *
 * Enforced on registration and password change — NOT on login (existing accounts,
 * incl. seeded demo users, keep working; the policy applies going forward).
 *
 * Rules: 12–128 chars, with at least one lowercase, uppercase, number, and
 * special character. Returns per-field errors so the client can show exactly
 * what's missing rather than a generic "invalid password".
 */

export const PASSWORD_MIN = 12
export const PASSWORD_MAX = 128

export interface PasswordPolicyResult {
  valid: boolean
  errors: string[]
}

/** Password max age for the 90-day expiry check (env-overridable, default 90 days). */
export const passwordMaxAgeMs = (): number => {
  const days = Number(process.env.PASSWORD_MAX_AGE_DAYS) || 90
  return days * 24 * 60 * 60 * 1000
}

/** True if the password was last changed longer ago than the max age. */
export const isPasswordExpired = (changedAt?: Date | null): boolean =>
  !!changedAt && Date.now() - new Date(changedAt).getTime() > passwordMaxAgeMs()

export const validatePassword = (pw: unknown): PasswordPolicyResult => {
  const errors: string[] = []
  const s = typeof pw === 'string' ? pw : ''

  if (s.length < PASSWORD_MIN) errors.push(`Password must be at least ${PASSWORD_MIN} characters`)
  if (s.length > PASSWORD_MAX) errors.push(`Password must be at most ${PASSWORD_MAX} characters`)
  if (!/[a-z]/.test(s)) errors.push('Password must include a lowercase letter')
  if (!/[A-Z]/.test(s)) errors.push('Password must include an uppercase letter')
  if (!/[0-9]/.test(s)) errors.push('Password must include a number')
  // Anything that isn't a letter or digit counts as a special character.
  if (!/[^A-Za-z0-9]/.test(s)) errors.push('Password must include a special character')

  return { valid: errors.length === 0, errors }
}
