import axios, { AxiosError } from 'axios'

/**
 * Single axios instance for the entire app.
 * - Reads JWT from localStorage on every request via the request interceptor.
 * - Logs the user out on any 401 response (token expired/invalid).
 *
 * Why localStorage instead of httpOnly cookie:
 *   The backend uses Bearer-header JWT (per spec). For a CSR-heavy SPA on
 *   Vercel + Render, header auth is simpler and avoids the SameSite/CORS
 *   cookie dance. The XSS surface is the trade-off — keep CSP strict.
 */

export const TOKEN_KEY = 'baskhoj.token'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050',
  headers: { 'Content-Type': 'application/json' },
})

// ---- Request: attach JWT ----
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// ---- Response: clear auth and bounce to /auth/login on 401 ----
const PUBLIC_PATH_PREFIXES = ['/listings']
const PUBLIC_API_PREFIXES = ['/api/listings']

const isPublicPath = (pathname: string) =>
  pathname === '/' || PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))

const isPublicApiRequest = (url?: string) => {
  if (!url) return false
  const baseUrl = api.defaults.baseURL || ''
  const normalized = url.startsWith('http') && baseUrl ? url.replace(baseUrl, '') : url
  return PUBLIC_API_PREFIXES.some((prefix) => normalized.startsWith(prefix))
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const pathname = window.location.pathname
      const isPublic = isPublicPath(pathname) || isPublicApiRequest(error.config?.url)

      if (!isPublic) {
        localStorage.removeItem(TOKEN_KEY)
        // Avoid redirect loops if the user IS on /auth/login already
        if (!pathname.startsWith('/auth/')) {
          window.location.href = '/auth/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
