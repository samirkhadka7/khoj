'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import api from '@/lib/axios'
import { useAdmin } from '@/components/admin/AdminContext'
import type { ApiResponse, User, UserRole } from '@/types'

const PAGE_LIMIT = 20

interface ExtendedUser extends User {
  isBanned?: boolean
}

function UsersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user: me } = useAdmin()

  const [users, setUsers] = useState<ExtendedUser[]>([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)

  const search = searchParams.get('search') || ''
  const role = (searchParams.get('role') || '') as UserRole | ''
  const banned = searchParams.get('banned') || ''
  const page = Number(searchParams.get('page') || 1)

  const [searchInput, setSearchInput] = useState(search)

  const setParam = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([k, v]) => {
        if (v === '') params.delete(k)
        else params.set(k, v)
      })
      // Reset page on filter change unless explicitly setting page
      if (!('page' in updates)) params.delete('page')
      router.push(`/admin/users?${params.toString()}`)
    },
    [router, searchParams]
  )

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const q = new URLSearchParams()
        if (search) q.set('search', search)
        if (role) q.set('role', role)
        if (banned) q.set('banned', banned)
        q.set('page', String(page))
        q.set('limit', String(PAGE_LIMIT))

        const { data } = await api.get<ApiResponse<ExtendedUser[]>>(`/api/admin/users?${q}`)
        if (cancelled) return
        if (data.success && data.data) {
          setUsers(data.data)
          if (data.pagination)
            setPagination({
              page: data.pagination.page,
              pages: data.pagination.pages,
              total: data.pagination.total,
            })
        }
      } catch (err: unknown) {
        if (cancelled) return
        const e = err as { response?: { data?: { message?: string } } }
        toast.error(e.response?.data?.message || 'Failed to load users')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [search, role, banned, page])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setParam({ search: searchInput.trim() })
  }

  const handleBan = async (id: string, name: string) => {
    if (!confirm(`Ban ${name}? They won't be able to log in.`)) return
    setActingId(id)
    try {
      await api.patch(`/api/admin/users/${id}/ban`)
      toast.success(`${name} banned`)
      setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, isBanned: true } : u)))
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Could not ban user')
    } finally {
      setActingId(null)
    }
  }

  const handleUnban = async (id: string, name: string) => {
    setActingId(id)
    try {
      await api.patch(`/api/admin/users/${id}/unban`)
      toast.success(`${name} unbanned`)
      setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, isBanned: false } : u)))
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Could not unban user')
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="px-8 py-8 max-w-[1100px]">
      <div className="mb-6">
        <h1 className="font-display font-extrabold text-[28px] text-gray-800 tracking-[-0.5px]">
          Users
          {!loading && (
            <span className="text-gray-400 font-medium ml-2">({pagination.total})</span>
          )}
        </h1>
        <p className="text-[14px] text-gray-600 mt-1">
          Search, filter, and manage user accounts. Admins are protected from being banned via API.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-lg p-4 mb-5 shadow-card">
        <div className="flex gap-3 flex-wrap items-end">
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[260px]">
            <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-[0.6px] mb-1.5">
              Search by name or email
            </label>
            <div className="relative">
              <Search
                size={15}
                strokeWidth={2.2}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="e.g. samir@test.com"
                className="w-full h-10 pl-10 pr-3 font-body text-[14px] text-gray-800 bg-white border-[1.5px] border-gray-200 rounded-sm outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(29,158,117,.1)] transition-all"
              />
            </div>
          </form>

          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-[0.6px] mb-1.5">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setParam({ role: e.target.value })}
              className="h-10 px-3 pr-8 font-body text-[14px] text-gray-800 bg-white border-[1.5px] border-gray-200 rounded-sm outline-none cursor-pointer appearance-none focus:border-primary transition-colors"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%239ba3ad' d='M1 1l5 5 5-5'/%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
              }}
            >
              <option value="">All roles</option>
              <option value="user">User</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-[0.6px] mb-1.5">
              Status
            </label>
            <select
              value={banned}
              onChange={(e) => setParam({ banned: e.target.value })}
              className="h-10 px-3 pr-8 font-body text-[14px] text-gray-800 bg-white border-[1.5px] border-gray-200 rounded-sm outline-none cursor-pointer appearance-none focus:border-primary transition-colors"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%239ba3ad' d='M1 1l5 5 5-5'/%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
              }}
            >
              <option value="">All</option>
              <option value="false">Active</option>
              <option value="true">Banned</option>
            </select>
          </div>

          {(search || role || banned) && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('')
                router.push('/admin/users')
              }}
              className="h-10 px-4 bg-white border-[1.5px] border-gray-200 rounded-sm text-[13px] font-semibold text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-gray-400" />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-lg p-10 text-center">
          <p className="text-[14px] text-gray-600">No users match those filters.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-lg overflow-hidden shadow-card">
          {/* Header */}
          <div className="hidden md:grid grid-cols-[2.5fr_1fr_1fr_1fr_140px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-600 uppercase tracking-[0.6px]">
            <div>User</div>
            <div>Role</div>
            <div>Phone</div>
            <div>Joined</div>
            <div className="text-right">Actions</div>
          </div>

          {users.map((u) => {
            const isMe = u._id === me._id
            const isAdmin = u.role === 'admin'
            const cannotBan = isMe || isAdmin
            return (
              <div
                key={u._id}
                className="md:grid md:grid-cols-[2.5fr_1fr_1fr_1fr_140px] gap-4 px-5 py-4 border-b border-gray-100 last:border-b-0 items-center"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary-subtle flex items-center justify-center text-primary font-display font-bold text-[12.5px] flex-shrink-0">
                    {u.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-gray-800 truncate flex items-center gap-1.5">
                      {u.name}
                      {isMe && (
                        <span className="text-[10px] font-bold text-primary bg-primary-subtle px-1.5 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                      {u.isVerified && (
                        <ShieldCheck size={13} className="text-primary" strokeWidth={2.5} />
                      )}
                    </div>
                    <div className="text-[12px] text-gray-400 truncate">{u.email}</div>
                  </div>
                </div>

                <div className="mt-2 md:mt-0">
                  <span
                    className={clsx(
                      'inline-block text-[11px] font-bold uppercase tracking-[0.5px] px-2 py-0.5 rounded-full',
                      u.role === 'admin' && 'bg-accent-subtle text-accent',
                      u.role === 'owner' && 'bg-primary-subtle text-dark-mid',
                      u.role === 'user' && 'bg-gray-100 text-gray-700'
                    )}
                  >
                    {u.role}
                  </span>
                </div>

                <div className="mt-1 md:mt-0 text-[13px] text-gray-600">
                  {u.phone ? `+977 ${u.phone}` : <span className="text-gray-300">—</span>}
                </div>

                <div className="mt-1 md:mt-0 text-[12.5px] text-gray-500">
                  {new Date(u.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>

                <div className="mt-3 md:mt-0 flex justify-end items-center gap-2">
                  {u.isBanned ? (
                    <>
                      <span className="text-[10.5px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full mr-1">
                        Banned
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUnban(u._id, u.name)}
                        disabled={actingId === u._id}
                        className="h-8 px-3 bg-white border-[1.5px] border-primary rounded-sm text-[12.5px] font-bold text-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        {actingId === u._id ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <UserCheck size={12} strokeWidth={2.5} />
                        )}
                        Unban
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleBan(u._id, u.name)}
                      disabled={cannotBan || actingId === u._id}
                      title={
                        isMe
                          ? "Can't ban yourself"
                          : isAdmin
                          ? "Can't ban an admin"
                          : 'Ban this user'
                      }
                      className="h-8 px-3 bg-white border-[1.5px] border-gray-200 rounded-sm text-[12.5px] font-semibold text-gray-700 hover:border-red-400 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:text-gray-700 flex items-center gap-1"
                    >
                      {actingId === u._id ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <UserX size={12} strokeWidth={2.5} />
                      )}
                      Ban
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            type="button"
            onClick={() => setParam({ page: String(Math.max(1, page - 1)) })}
            disabled={page <= 1}
            className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-sm text-gray-600 hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-[13px] text-gray-600 px-3">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            type="button"
            onClick={() => setParam({ page: String(Math.min(pagination.pages, page + 1)) })}
            disabled={page >= pagination.pages}
            className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-sm text-gray-600 hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

export default function UsersPage() {
  return (
    <Suspense
      fallback={
        <div className="px-8 py-12 flex justify-center">
          <Loader2 size={28} className="text-gray-400 animate-spin" />
        </div>
      }
    >
      <UsersContent />
    </Suspense>
  )
}
