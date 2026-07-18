'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import api, { getAccessToken, silentRefresh, clearAccessToken } from '@/lib/axios'
import type { ApiResponse, User } from '@/types'

interface DashboardContextValue {
  user: User
  refresh: () => Promise<void>
  logout: () => void
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

/**
 * Auth guard for /dashboard routes.
 * Fetches /api/auth/me on mount; redirects to /auth/login if unauthenticated.
 * Provides the user via React Context to all children.
 */
export function DashboardProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = async () => {
    try {
      const { data } = await api.get<ApiResponse<User>>('/api/auth/me')
      if (data.success && data.data) setUser(data.data)
    } catch {
      // axios interceptor already redirects on 401
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void (async () => {
      // Access token lives in memory, so a page reload starts with none — restore
      // it from the HttpOnly refresh cookie before deciding the user is logged out.
      if (!getAccessToken()) {
        const ok = await silentRefresh()
        if (!ok) {
          router.replace('/auth/login')
          return
        }
      }
      await fetchUser()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const logout = async () => {
    // Revoke the session family server-side, then drop the in-memory token.
    try {
      await api.post('/api/auth/logout')
    } catch {
      // best-effort — clear locally regardless
    }
    clearAccessToken()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-offWhite">
        <Loader2 size={32} className="text-gray-400 animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <DashboardContext.Provider value={{ user, refresh: fetchUser, logout }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboardUser(): DashboardContextValue {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboardUser must be used inside <DashboardProvider>')
  return ctx
}
