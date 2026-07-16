import mongoose from 'mongoose'

/**
 * Connect to MongoDB using the URI from .env.
 * Throws if MONGODB_URI is missing — server won't start without a DB.
 */
export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in .env')
  }
  

  try {
    const conn = await mongoose.connect(uri)
    console.log(`[DB] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`)
  } catch (err) {
    console.error('[DB] MongoDB connection error:', err)
    throw err
  }

  // Surface connection drops in dev — Atlas cold starts and network hiccups are easy to miss otherwise
  mongoose.connection.on('disconnected', () => {
    console.warn('[DB] MongoDB disconnected')
  })

  mongoose.connection.on('error', (err) => {
    console.error('[DB] MongoDB runtime error:', err)
  })
}
