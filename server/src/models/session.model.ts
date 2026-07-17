import { Schema, model, Types } from 'mongoose'

/**
 * Session / refresh-token store (Feature 5 — secure sessions).
 *
 * Each document is ONE refresh-token generation inside a login "session family"
 * (familyId). Refresh-token ROTATION appends a new document to the same family
 * and marks the previous one `usedAt`. This single collection gives us:
 *
 *   - Server-side revocation — logout / admin sets `revokedAt`, so a stolen but
 *     still-unexpired refresh token can be killed (the current bearer-JWT model
 *     has no revocation at all).
 *   - Rotation + reuse detection — presenting an already-`usedAt` or `revokedAt`
 *     token is treated as THEFT, and the whole family is revoked.
 *   - Device binding — `userAgentHash` is compared on refresh; a materially
 *     different client is rejected.
 *
 * We store only the SHA-256 HASH of the refresh token, never the raw token — a
 * DB leak cannot be replayed as a valid refresh token. SHA-256 (not bcrypt) is
 * correct here: the token is a 256-bit random secret (no brute-force/dictionary
 * risk), and refresh lookups must be fast and indexable.
 */
export interface ISession {
  _id: Types.ObjectId
  userId: Types.ObjectId
  familyId: string // stable across rotations = the logical session
  tokenHash: string // sha256(rawRefreshToken) — unique, looked up on refresh
  userAgentHash: string // sha256(user-agent) for device/UA binding
  expiresAt: Date // refresh-token expiry (TTL-indexed for auto-cleanup)
  usedAt?: Date // set when this token is rotated (consumed)
  revokedAt?: Date // set on logout or reuse-detection
  createdAt: Date
  updatedAt: Date
}

const sessionSchema = new Schema<ISession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    familyId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    userAgentHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
    revokedAt: { type: Date },
  },
  { timestamps: true }
)

// TTL index — Mongo auto-removes rows once expiresAt passes, so expired/rotated
// sessions don't accumulate. (Cleanup is best-effort/background, not exact-time.)
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const Session = model<ISession>('Session', sessionSchema)
