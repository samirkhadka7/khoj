import { AuditLog, type IAuditLog } from '../models'

/**
 * Real-time monitoring / alerting (Feature 6).
 *
 * audit() calls monitorEvent() after every logged event; monitorEvent runs the
 * suspicious-pattern checks over the audit trail and fires raiseAlert on a hit.
 * Alerts are de-duped per key/window so one ongoing attack doesn't spam.
 */

// --- thresholds ---
const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000
const FAILED_LOGIN_THRESHOLD = 5
const KYC_REJECT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const KYC_REJECT_THRESHOLD = 3
const ALERT_COOLDOWN_MS = 15 * 60 * 1000 // don't re-alert the same key within this

// De-dup: last time we alerted for a given key. unref'd sweep keeps it bounded.
const lastAlerted = new Map<string, number>()
const shouldAlert = (key: string): boolean => {
  const now = Date.now()
  const last = lastAlerted.get(key)
  if (last && now - last < ALERT_COOLDOWN_MS) return false
  lastAlerted.set(key, now)
  return true
}
setInterval(() => {
  const cutoff = Date.now() - ALERT_COOLDOWN_MS
  for (const [k, t] of lastAlerted) if (t < cutoff) lastAlerted.delete(k)
}, ALERT_COOLDOWN_MS).unref()

export interface AlertPayload {
  type: string // e.g. 'brute_force', 'kyc_abuse', 'session_theft'
  message: string
  meta?: Record<string, unknown>
}

/**
 * Emit an alert. Always logs to the console with a distinct [ALERT] prefix; if
 * ALERT_WEBHOOK_URL is set, also fire-and-forget POSTs it (Slack-style). Never
 * throws — alerting must not break the request path.
 */
export const raiseAlert = (alert: AlertPayload): void => {
  console.warn(`[ALERT] ${alert.type}: ${alert.message}`, alert.meta ?? '')

  const url = process.env.ALERT_WEBHOOK_URL
  if (url) {
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `:rotating_light: [ALERT] ${alert.type}: ${alert.message}`,
        ...alert,
      }),
    }).catch((err) => console.error('[Alert] webhook POST failed:', err))
  }
}

/**
 * Called once per audited event (from utils/audit.ts). Runs the pattern checks;
 * never throws (a monitoring failure must not affect the request).
 */
export const monitorEvent = async (event: IAuditLog): Promise<void> => {
  try {
    // 1. Failed-login burst from one IP.
    if (event.action === 'auth.login.failure' && event.ip) {
      const since = new Date(Date.now() - FAILED_LOGIN_WINDOW_MS)
      const count = await AuditLog.countDocuments({
        action: 'auth.login.failure',
        ip: event.ip,
        createdAt: { $gte: since },
      })
      if (count >= FAILED_LOGIN_THRESHOLD && shouldAlert(`brute_force:${event.ip}`)) {
        raiseAlert({
          type: 'brute_force',
          message: `${count} failed logins from ${event.ip} in the last 15 min`,
          meta: { ip: event.ip, count },
        })
      }
      return
    }

    // 2. Repeated KYC rejections for one account (targetId = the applicant).
    if (event.action === 'kyc.reject' && event.targetId) {
      const since = new Date(Date.now() - KYC_REJECT_WINDOW_MS)
      const count = await AuditLog.countDocuments({
        action: 'kyc.reject',
        targetId: event.targetId,
        createdAt: { $gte: since },
      })
      if (count >= KYC_REJECT_THRESHOLD && shouldAlert(`kyc_abuse:${event.targetId}`)) {
        raiseAlert({
          type: 'kyc_abuse',
          message: `KYC rejected ${count} times for user ${event.targetId}`,
          meta: { userId: String(event.targetId), count },
        })
      }
      return
    }

    // 3. Refresh-token reuse — a single event is enough (session theft signal).
    if (event.action === 'auth.session.reuse_detected') {
      const key = `session_theft:${event.actorId ?? event.ip ?? 'unknown'}`
      if (shouldAlert(key)) {
        raiseAlert({
          type: 'session_theft',
          message: `Refresh-token reuse detected for user ${event.actorId}`,
          meta: { userId: String(event.actorId), familyId: event.meta?.familyId },
        })
      }
    }
  } catch (err) {
    console.error('[Monitor] pattern check failed:', err)
  }
}
