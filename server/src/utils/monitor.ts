import type { IAuditLog } from '../models'

/**
 * Real-time monitoring / alerting (Feature 6).
 *
 * SCAFFOLD (commit 1): the alert SINK is complete and usable; the suspicious-
 * pattern detection (failed-login bursts, repeated KYC rejections, refresh-token
 * reuse) is wired into monitorEvent in a later commit. audit() calls monitorEvent
 * after every logged event so those checks have a single entry point.
 */

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
 * Called once per audited event (from utils/audit.ts). No-op scaffold for now —
 * pattern detection is added in the alerting commit.
 */
export const monitorEvent = async (_event: IAuditLog): Promise<void> => {
  // intentionally empty until the pattern-detection commit
}
