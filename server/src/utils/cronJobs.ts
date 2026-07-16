import cron from 'node-cron'
import { ContactRequest } from '../models'

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
export const startCronJobs = (): void => {
  // '0 * * * *' = at minute 0 of every hour
  cron.schedule('0 * * * *', async () => {
    try {
      const result = await ContactRequest.updateMany(
        { status: 'pending', expiresAt: { $lt: new Date() } },
        { $set: { status: 'expired' } }
      )
      if (result.modifiedCount > 0) {
        console.log(`[Cron] Expired ${result.modifiedCount} pending request(s)`)
      }
    } catch (err) {
      console.error('[Cron] expire-pending-requests failed:', err)
    }
  })

  console.log('[Cron] Scheduled: expire pending contact requests (hourly)')
}
