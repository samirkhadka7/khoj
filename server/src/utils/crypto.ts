import crypto from 'crypto'

/**
 * Application-level symmetric encryption (AES-256-GCM).
 *
 * Used for data that must be RECOVERABLE, not merely verifiable:
 *   - TOTP shared secrets (Feature 1 / MFA) — the server must decrypt them to
 *     recompute the 6-digit code on every login.
 *   - Sensitive KYC fields (Feature 4) — an admin must decrypt them to review.
 *
 * This is DELIBERATELY DIFFERENT from password handling. Passwords are one-way
 * bcrypt-hashed because we never need the original back — we only compare hashes.
 * These values we DO need back, so we encrypt them with a key held OUTSIDE the
 * database.
 *
 * Threat model: an attacker who steals only the MongoDB data gets ciphertext,
 * which is useless without ENCRYPTION_KEY. The key lives in the environment
 * (in production: a secrets manager / KMS — see getKey notes), never in the DB
 * or the repo. So a DB-only breach does not expose TOTP secrets or KYC data.
 *
 * Stored format (all base64, colon-separated), with a version tag so keys can be
 * rotated later without ambiguity about which key decrypts a given value:
 *   v1:<iv>:<authTag>:<ciphertext>
 *
 * GCM gives us confidentiality AND integrity: setAuthTag() makes decrypt() throw
 * if the ciphertext (or IV/tag) was tampered with, so we can't be tricked into
 * accepting a forged secret.
 */

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96-bit nonce — the recommended IV size for GCM
const KEY_VERSION = 'v1'

/**
 * Loads the 32-byte key from ENCRYPTION_KEY (hex- or base64-encoded).
 * Throws loudly at first use if missing or the wrong length — we never want to
 * silently "encrypt" with a bad key. Generate one with: openssl rand -hex 32
 *
 * PRODUCTION KEY MANAGEMENT (conceptual — not implemented for coursework scope):
 *   - Load path: the key would be injected by a secrets manager (AWS KMS,
 *     GCP Secret Manager, HashiCorp Vault) at boot, not read from a plain file.
 *   - Rotation: introduce v2 with a fresh key. NEW writes encrypt with v2; OLD
 *     ciphertext stays readable because decrypt() selects the key by the version
 *     prefix. A background re-encryption job migrates v1 -> v2 over time, after
 *     which the v1 key can be retired.
 *   - Old ciphertext after rotation: it does NOT become garbage — it is still
 *     decryptable as long as the v1 key is retained for reads until migration
 *     completes.
 */
const getKey = (): Buffer => {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) throw new Error('ENCRYPTION_KEY is not defined in .env')
  // Accept hex (64 chars) or base64; normalize to a 32-byte Buffer
  const key = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, 'hex')
    : Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must decode to 32 bytes (generate with: openssl rand -hex 32)')
  }
  return key
}

/** Encrypt a UTF-8 string. Returns the versioned, base64-packed ciphertext string. */
export const encrypt = (plaintext: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [
    KEY_VERSION,
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':')
}

/** Decrypt a string produced by encrypt(). Throws if the value was tampered with. */
export const decrypt = (payload: string): string => {
  const [version, ivB64, tagB64, dataB64] = payload.split(':')
  if (version !== KEY_VERSION) {
    // When v2 is introduced, choose the key by `version` here instead of throwing.
    throw new Error(`Unsupported ciphertext version: ${version}`)
  }
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(tagB64, 'base64')
  const data = Buffer.from(dataB64, 'base64')
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(authTag) // GCM integrity check — throws on any tampering
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}
