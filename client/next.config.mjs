/** @type {import('next').NextConfig} */

// Same-origin API proxy (Feature 5, commit 6).
// The browser only ever talks to the FRONTEND origin; Next.js forwards /api/* to
// the backend server-side. This makes the auth cookies first-party to the app
// origin, so SameSite=Strict works in production where the frontend (Vercel) and
// API (Render) are otherwise cross-site and a Strict cookie would not be sent.
//
// Only the REST API is proxied — Socket.io connects DIRECTLY to the backend
// (via NEXT_PUBLIC_SOCKET_URL), because websocket proxying through Next/Vercel
// rewrites is unreliable, and the socket authenticates with the Bearer access
// token (not the cookie), so it doesn't need same-origin.
const API_PROXY_TARGET = process.env.API_PROXY_TARGET || 'http://localhost:5050'

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
