import { generateSecret, generateURI, verify } from 'otplib'
import qrcode from 'qrcode'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

/**
 * TOTP (RFC 6238) + backup-code helpers for MFA.
 *
 * Design notes for the viva:
 *   - TOTP is chosen over SMS OTP: SMS is vulnerable to SIM-swap / SS7 and is
 *     unreliable+costly in Nepal (the project already stubs Sparrow SMS). TOTP is
 *     offline, free, and NIST-preferred over SMS.
 *   - The TOTP secret is a SHARED secret: the server recomputes the code from
 *     (secret + current 30s time-step) via HMAC on every login, so it must be
 *     stored reversibly (encrypted via utils/crypto), NOT hashed.
 *   - Backup codes are the opposite: we only ever verify a presented code, so they
 *     are bcrypt-hashed (like passwords) and single-use.
 */

const ISSUER = 'BaasKhoj'
const BACKUP_CODE_COUNT = 10
const BCRYPT_ROUNDS = 10

// Accept a token that was valid up to 30s before/after now (±1 standard 30s
// time-step) to tolerate clock drift between the server and the user's phone.
const EPOCH_TOLERANCE_SECONDS = 30

/** Generate a new base32 TOTP secret (what gets encrypted and stored). */
export const generateTotpSecret = (): string => generateSecret()

/**
 * Build the otpauth:// URI the authenticator app imports. Contains the secret,
 * so it is only ever sent to the enrolling user over their authenticated session.
 */
export const buildOtpAuthUrl = (secret: string, accountName: string): string =>
  generateURI({ issuer: ISSUER, label: accountName, secret })

/** Render the otpauth URI as a scannable QR-code data URL (PNG, base64). */
export const buildQrDataUrl = (otpauthUrl: string): Promise<string> =>
  qrcode.toDataURL(otpauthUrl)

/**
 * Verify a user-submitted 6-digit code against the (decrypted) secret.
 * otplib's verify() uses constant-time comparison internally (anti-timing).
 */
export const verifyTotp = async (token: string, secret: string): Promise<boolean> => {
  // Malformed input (e.g. non-numeric) makes verify throw — treat as invalid.
  try {
    const result = await verify({
      secret,
      token: token.trim(),
      epochTolerance: EPOCH_TOLERANCE_SECONDS,
    })
    return result.valid
  } catch {
    return false
  }
}

/** Normalize a backup code for comparison: strip separators/spaces, lowercase. */
const normalizeBackupCode = (code: string): string =>
  code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()

/**
 * Generate a fresh set of backup codes.
 * Returns the PLAINTEXT codes (shown to the user exactly once) and their hashed
 * form (stored). We hash the normalized value so display formatting (the dash)
 * doesn't affect verification.
 */
export const generateBackupCodes = (): {
  plain: string[]
  hashed: { codeHash: string }[]
} => {
  const plain: string[] = []
  const hashed: { codeHash: string }[] = []
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const raw = crypto.randomBytes(5).toString('hex') // 10 hex chars
    const display = `${raw.slice(0, 5)}-${raw.slice(5)}` // e.g. "a1b2c-3d4e5"
    plain.push(display)
    hashed.push({ codeHash: bcrypt.hashSync(normalizeBackupCode(display), BCRYPT_ROUNDS) })
  }
  return { plain, hashed }
}

/**
 * Try to consume a backup code. Scans the user's stored codes for the first
 * UNUSED one that matches; if found, marks it used (mutates the array in place)
 * and returns the index so the caller can persist. Returns -1 on no match.
 */
export const matchAndConsumeBackupCode = async (
  input: string,
  codes: { codeHash: string; usedAt?: Date }[] | undefined
): Promise<number> => {
  if (!codes || codes.length === 0) return -1
  const normalized = normalizeBackupCode(input)
  for (let i = 0; i < codes.length; i++) {
    if (codes[i].usedAt) continue // already spent
    if (await bcrypt.compare(normalized, codes[i].codeHash)) {
      codes[i].usedAt = new Date()
      return i
    }
  }
  return -1
}
