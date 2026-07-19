import type { User } from '@/types'

/**
 * Union shape the auth endpoints (/login, /login/mfa, /reset-expired-password) can
 * return. The login state machine inspects it: a session (token+user), a required
 * second factor (mfaRequired+mfaToken), or an expired password (passwordExpired+
 * resetToken).
 */
export interface AuthResult {
  token?: string
  user?: User
  mfaRequired?: boolean
  mfaToken?: string
  passwordExpired?: boolean
  resetToken?: string
  mfaSetupRequired?: boolean
  usedBackupCode?: boolean
}
