import { Schema, model, Types } from 'mongoose'

/**
 * Append-only audit log (Feature 6).
 *
 * One row per security-relevant event. Deliberately MINIMAL by design — it stores
 * WHO (actorId), WHAT (action), WHERE-FROM (ip), the OUTCOME, and a small non-
 * sensitive `meta` blob. It must NEVER contain plaintext passwords, TOTP secrets,
 * backup codes, raw KYC document content/refs, or JWTs — that exclusion is enforced
 * at the call sites (see utils/audit.ts) rather than the schema.
 *
 * Immutable: timestamps has createdAt only (no updatedAt); nothing updates a row.
 */
export interface IAuditLog {
  _id: Types.ObjectId
  action: string // dotted taxonomy, e.g. 'login.failure', 'kyc.reject'
  actorId?: Types.ObjectId // who performed it (absent for anonymous / failed login)
  targetId?: Types.ObjectId // resource acted upon (listing, kyc, user, contact request)
  ip?: string // real client IP (via trust proxy)
  outcome: 'success' | 'failure'
  meta?: Record<string, unknown> // small, non-sensitive context only
  createdAt: Date
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    targetId: { type: Schema.Types.ObjectId },
    ip: { type: String },
    outcome: { type: String, enum: ['success', 'failure'], required: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

// Indexes for the admin viewer + the monitor's pattern queries.
auditLogSchema.index({ createdAt: -1 })
auditLogSchema.index({ action: 1, createdAt: -1 })
auditLogSchema.index({ actorId: 1, createdAt: -1 })
auditLogSchema.index({ ip: 1, createdAt: -1 })

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema)
