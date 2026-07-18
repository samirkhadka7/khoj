import type { Types } from 'mongoose'
import { AuditLog } from '../models'
import { monitorEvent } from './monitor'

/**
 * Central audit-logging helper (Feature 6).
 *
 * Callers pass ONLY non-sensitive fields — who/what/where/outcome + a small meta
 * object. NEVER pass a password, TOTP secret, backup code, raw KYC document
 * content/ref, or a JWT: those must not reach a log line.
 *
 * Fire-and-forget: a logging failure is caught and logged to the console, and can
 * never break or delay the request that triggered it.
 */
export interface AuditEntry {
  action: string
  actorId?: string | Types.ObjectId
  targetId?: string | Types.ObjectId
  ip?: string
  outcome?: 'success' | 'failure'
  meta?: Record<string, unknown>
}

export const audit = (entry: AuditEntry): void => {
  AuditLog.create({
    action: entry.action,
    actorId: entry.actorId,
    targetId: entry.targetId,
    ip: entry.ip,
    outcome: entry.outcome ?? 'success',
    meta: entry.meta,
  })
    .then((saved) => {
      void monitorEvent(saved)
    })
    .catch((err) => {
      console.error('[Audit] failed to write log:', err)
    })
}
