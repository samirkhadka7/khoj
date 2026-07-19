import http from 'http'
import express, { Application, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import mongoSanitize from 'express-mongo-sanitize'
import dotenv from 'dotenv'
// Load .env BEFORE we read env in module-scope (e.g. ALLOWED_ORIGINS below)
dotenv.config()
import { connectDB } from './config/db'
// Side-effect import — registers all Mongoose schemas at boot so indexes (e.g. 2dsphere) are built early
import './models'
import authRoutes from './routes/auth.routes'
import userRoutes from './routes/users.routes'
import listingRoutes from './routes/listing.routes'
import contactRoutes from './routes/contact.routes'
import notificationRoutes from './routes/notification.routes'
import messageRoutes from './routes/message.routes'
import reviewRoutes from './routes/review.routes'
import adminRoutes from './routes/admin.routes'
import kycRoutes from './routes/kyc.routes'
import { startCronJobs } from './utils/cronJobs'
import { initSocket } from './socket'

const app: Application = express()
const PORT: number = Number(process.env.PORT) || 5050

/* -------------------------------------------------------------------------- */
/*  Trust proxy (Feature 2/C)                                                  */
/* -------------------------------------------------------------------------- */
// Behind Render (and the Next.js /api proxy) the real client IP is in
// X-Forwarded-For. Trust EXACTLY the configured number of proxy hops so req.ip is
// the real client — otherwise every user shares the proxy's IP and per-IP rate
// limiting protects nothing (or over-blocks everyone). Default: 1 hop in prod,
// off in dev (no proxy). Set TRUST_PROXY_HOPS to match the real deploy chain.
// NEVER use `true`: it trusts any X-Forwarded-For and lets clients spoof their IP.
const trustProxyHops: number | boolean = process.env.TRUST_PROXY_HOPS
  ? Number(process.env.TRUST_PROXY_HOPS)
  : process.env.NODE_ENV === 'production'
    ? 1
    : false
app.set('trust proxy', trustProxyHops)

/* -------------------------------------------------------------------------- */
/*  Middleware                                                                */
/* -------------------------------------------------------------------------- */

// Security headers (CSP, X-Frame-Options, etc.)
app.use(helmet())

/**
 * CORS — supports a list of allowed origins via env (comma-separated).
 * Falls back to FRONTEND_URL for backwards compat with single-origin setups,
 * then to localhost for local dev.
 *
 * Example: ALLOWED_ORIGINS=https://baskhoj.com,https://staging.baskhoj.com,http://localhost:3000
 */
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  process.env.FRONTEND_URL ||
  'http://localhost:3000'
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

const isDev = process.env.NODE_ENV !== 'production'

app.use(
  cors({
    origin: (origin, cb) => {
      // No origin header = curl / server-to-server / same-origin → allow
      if (!origin) return cb(null, true)
      if (allowedOrigins.includes(origin)) return cb(null, true)
      // In development, allow ANY localhost/127.0.0.1 port. Next.js auto-bumps
      // to 3001/3002 when 3000 is taken, so hardcoding one port breaks dev.
      if (isDev && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return cb(null, true)
      }
      cb(new Error(`CORS: origin not allowed (${origin})`))
    },
    credentials: true,
  })
)

// Request logging — 'dev' format is colored and concise; switch to 'combined' in prod
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// Body parsers — limit raised to 10mb so JSON payloads with base64 previews don't get rejected
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Parses the HttpOnly refresh-token cookie into req.cookies (Feature 5).
app.use(cookieParser())

/**
 * NoSQL injection guard — strips `$` and `.` keys from req.body / req.params /
 * req.query so a malicious payload like `{ "email": { "$gt": "" } }` can't
 * smuggle Mongo operators into our queries. Logs replacements in dev so we
 * notice if legitimate inputs ever contain `$`.
 */
app.use(
  mongoSanitize({
    onSanitize: ({ key }) => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[Sanitize] Stripped key with $/. characters: ${key}`)
      }
    },
  })
)

/* -------------------------------------------------------------------------- */
/*  Routes                                                                    */
/* -------------------------------------------------------------------------- */

// Health check — used by uptime monitors and to confirm the server boots correctly
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      service: 'baskhoj-api',
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  })
})

// Root — friendly landing for anyone hitting the bare URL
app.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'BaasKhoj API — see /api/health for status',
  })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/listings', listingRoutes)
app.use('/api/contact-request', contactRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/kyc', kycRoutes)

/* -------------------------------------------------------------------------- */
/*  Error handling                                                            */
/* -------------------------------------------------------------------------- */

// 404 — runs when no route matched above
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found' })
})

// Global error handler — Express identifies this by its 4-arg signature, so `next` must stay
// even though it's unused
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error]', err.stack || err.message)
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  })
})


/* -------------------------------------------------------------------------- */
/*  Bootstrap                                                                 */
/* -------------------------------------------------------------------------- */

// Wrap Express in a raw HTTP server so Socket.io can attach to the same port.
// Without this, app.listen() returns its own internal server that we can't share.
const httpServer = http.createServer(app)
initSocket(httpServer)

// Connect DB first, then start listening — prevents accepting traffic before Mongoose is ready
const startServer = async (): Promise<void> => {
  try {
    await connectDB()
    // Start scheduled jobs only after DB is ready (cron uses Mongoose models)
    startCronJobs()
    httpServer.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`)
      console.log(`[Server] Health: http://localhost:${PORT}/api/health`)
      console.log(`[Server] Socket.io: ws://localhost:${PORT}`)
      console.log(`[Server] Env: ${process.env.NODE_ENV || 'development'}`)
    })
  } catch (err) {
    console.error('[Server] Failed to start:', err)
    process.exit(1)
  }
}

startServer()
