import cron from 'node-cron'
import { ContactRequest } from '../models'
import { audit } from './audit'

/**
 * Background tasks that run on a schedule. Started after the DB is connected
 * so the first run doesn't race with Mongoose bootstrap.
 *
 * Currently scheduled:
 *   - Hourly:  expire pending ContactRequests older than their expiresAt.
 *
 * Why update instead of TTL-delete:
 *   We want both tenant and owner to still see "this request expired" in
 *   their history. A TTL index would silently delete the document.
 */
/**
 * Expire pending contact requests past their expiresAt. Exported (not just inline
 * in the schedule) so it can be invoked/tested directly. Fetches the expiring rows
 * first so each is audited individually (system action — no actor/IP), then flips
 * them in one update. Returns the count expired.
 */
export const expirePendingRequests = async (): Promise<number> => {
  const expiring = await ContactRequest.find({
    status: 'pending',
    expiresAt: { $lt: new Date() },
  }).select('_id tenantId ownerId')

  if (expiring.length === 0) return 0

  await ContactRequest.updateMany(
    { _id: { $in: expiring.map((r) => r._id) } },
    { $set: { status: 'expired' } }
  )
  for (const r of expiring) {
    audit({
      action: 'contact.expire',
      targetId: r._id,
      outcome: 'success',
      meta: { tenantId: r.tenantId.toString(), ownerId: r.ownerId.toString() },
    })
  }
  return expiring.length
}

export const startCronJobs = (): void => {
  // '0 * * * *' = at minute 0 of every hour
  cron.schedule('0 * * * *', async () => {
    try {
      const n = await expirePendingRequests()
      if (n > 0) console.log(`[Cron] Expired ${n} pending request(s)`)
    } catch (err) {
      console.error('[Cron] expire-pending-requests failed:', err)
    }
  })

  console.log('[Cron] Scheduled: expire pending contact requests (hourly)')
}
