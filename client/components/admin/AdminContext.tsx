'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import api, { TOKEN_KEY } from '@/lib/axios'
import type { ApiResponse, User } from '@/types'

interface AdminContextValue {
  user: User
  refresh: () => Promise<void>
  logout: () => void
}

const AdminContext = createContext<AdminContextValue | null>(null)

/**
 * Auth gate for /admin/* routes.
 *
 * - No token → redirect to /auth/login
 * - Token but role !== 'admin' → redirect to /dashboard with a hard message
 *   (we don't allow tenants/owners to silently linger on /admin URLs)
 *
 * Returns full-bleed loader while we resolve identity.
 */
export function AdminProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUser = async () => {
    try {
      const { data } = await api.get<ApiResponse<User>>('/api/auth/me')
      if (data.success && data.data) {
        if (data.data.role !== 'admin') {
          setError('not-admin')
          return
        }
        setUser(data.data)
      }
    } catch {
      // axios interceptor handles 401 redirect on its own
      setError('unauth')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      router.replace('/auth/login')
      return
    }
    fetchUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const logout = () => {
    if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY)
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-offWhite">
        <Loader2 size={32} className="text-gray-400 animate-spin" />
      </div>
    )
  }

  if (error === 'not-admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-offWhite px-6">
        <div className="bg-white border border-gray-100 rounded-lg p-10 max-w-[440px] text-center shadow-card">
          <div className="w-14 h-14 mx-auto mb-3 bg-red-50 rounded-full flex items-center justify-center text-red-500 text-2xl">
            ⛔
          </div>
          <h1 className="font-display font-extrabold text-[20px] text-gray-800 mb-2">
            Admin access required
          </h1>
          <p className="text-[14px] text-gray-600 mb-5">
            This area is restricted to BaasKhoj administrators.
          </p>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="h-10 px-5 bg-primary text-white rounded-sm font-semibold text-[14px] hover:bg-dark transition-colors"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <AdminContext.Provider value={{ user, refresh: fetchUser, logout }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used inside <AdminProvider>')
  return ctx
}
