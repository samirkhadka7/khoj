/**
 * One-time migration: rename `role: 'tenant'` → `role: 'user'`.
 *
 * Run BEFORE deploying the role rename to production. The new User model enum
 * only allows ['user','owner','admin'], so existing 'tenant' docs would still
 * load fine (Mongoose enum is checked on save, not on read), but any future
 * .save() on those docs would fail validation. This script flips them all
 * once so the data is consistent with the new schema.
 *
 * Idempotent: running twice does nothing the second time.
 *
 * Usage (from server/ folder):
 *   npx ts-node scripts/migrate-tenant-role.ts
 *   # or set MONGODB_URI to point at staging/prod:
 *   MONGODB_URI="mongodb+srv://..." npx ts-node scripts/migrate-tenant-role.ts
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const main = async () => {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI is not set — aborting.')
    process.exit(1)
  }

  console.log(`[Migrate] Connecting to ${uri.replace(/:[^:@]+@/, ':****@')}`)
  await mongoose.connect(uri)
  console.log(`[Migrate] Connected to ${mongoose.connection.name}`)

  // Hit the raw collection so the new schema's enum validator doesn't reject
  // the lookup (it wouldn't anyway on read, but raw avoids any model-cache
  // surprises if the User model file gets imported as a side-effect).
  const users = mongoose.connection.collection('users')

  const before = await users.countDocuments({ role: 'tenant' })
  console.log(`[Migrate] Found ${before} user(s) with role: 'tenant'`)

  if (before === 0) {
    console.log('[Migrate] Nothing to do — exiting.')
    await mongoose.disconnect()
    return
  }

  const result = await users.updateMany(
    { role: 'tenant' },
    { $set: { role: 'user' } }
  )
  console.log(
    `[Migrate] Updated ${result.modifiedCount} user(s). matchedCount=${result.matchedCount}`
  )

  // Sanity check
  const remaining = await users.countDocuments({ role: 'tenant' })
  if (remaining !== 0) {
    console.error(`[Migrate] WARNING: ${remaining} user(s) still have role 'tenant'`)
  } else {
    console.log('[Migrate] Done. All tenant roles migrated to user.')
  }

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('[Migrate] Failed:', err)
  process.exit(1)
})
