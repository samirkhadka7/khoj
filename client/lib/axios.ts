import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

/**
 * Single axios instance for the entire app (Feature 5 — secure sessions).
 *
 * Token model:
 *   - The ACCESS token is short-lived and kept ONLY in memory (a module variable),
 *     never in localStorage — so XSS can't read a long-lived credential.
 *   - The REFRESH token is an HttpOnly, SameSite=Strict cookie the browser holds;
 *     JS never sees it. `withCredentials: true` makes the browser send it to the
 *     /api/auth/* endpoints (refresh, logout).
 *   - On a 401, we transparently hit /api/auth/refresh once, store the new access
 *     token, and retry the original request. On a page reload (memory cleared) we
 *     restore the session with silentRefresh().
 */

/* -------------------- in-memory access token -------------------- */
let accessToken: string | null = null
export const setAccessToken = (t: string | null): void => {
  accessToken = t
}
export const getAccessToken = (): string | null => accessToken
export const clearAccessToken = (): void => {
  accessToken = null
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send/receive the HttpOnly refresh cookie
})

// ---- Request: attach the in-memory access token ----
api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

/* -------------------- refresh handling -------------------- */

// Bare client (NO interceptors) for hitting /refresh, so a 401 from the refresh
// call itself can't recurse back into this logic.
const refreshClient = axios.create({
  baseURL: api.defaults.baseURL,
  withCredentials: true,
})

// Dedupe concurrent refreshes — many 401s at once share one /refresh round-trip.
let refreshInFlight: Promise<string | null> | null = null

/** Exchange the refresh cookie for a new access token. Returns null on failure. */
export const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshInFlight) {
    refreshInFlight = refreshClient
      .post<{ data?: { token?: string } }>('/api/auth/refresh')
      .then((res) => {
        const t = res.data?.data?.token ?? null
        setAccessToken(t)
        return t
      })
      .catch(() => {
        clearAccessToken()
        return null
      })
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

/** Restore the in-memory access token from the refresh cookie (startup/reload). */
export const silentRefresh = async (): Promise<boolean> => (await refreshAccessToken()) !== null

/* -------------------- 401 -> refresh -> retry -------------------- */
const PUBLIC_PATH_PREFIXES = ['/listings']
const isPublicPath = (pathname: string): boolean =>
  pathname === '/' || PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const url = original?.url || ''
    // Never try to refresh the auth endpoints themselves.
    const isAuthEndpoint =
      url.includes('/api/auth/refresh') || url.includes('/api/auth/login')

    if (error.response?.status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true
      const newToken = await refreshAccessToken()
      if (newToken) {
        original.headers = original.headers ?? {}
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original) // retry the original request once
      }
      // Refresh failed → the session is gone. Bounce to login, but not from
      // public pages (which render fine logged-out) or the auth pages themselves.
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname
        if (!isPublicPath(pathname) && !pathname.startsWith('/auth/')) {
          window.location.href = '/auth/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
