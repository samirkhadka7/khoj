'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/axios'
import type { ApiResponse, Listing, User } from '@/types'

interface ListingReport {
  userId: string | User
  reason: string
  createdAt: string
}

interface ReportedListing extends Listing {
  reports: ListingReport[]
}

export default function ReportsPage() {
  const [items, setItems] = useState<ReportedListing[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get<ApiResponse<ReportedListing[]>>('/api/admin/reports')
      if (data.success && data.data) setItems(data.data)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleUnverify = async (id: string, title: string) => {
    if (!confirm(`Remove verified status from "${title}"?`)) return
    setActingId(id)
    try {
      await api.patch(`/api/admin/listings/${id}/unverify`)
      toast.success('Listing unverified')
      await load()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Could not unverify')
    } finally {
      setActingId(null)
    }
  }

  const handleVerify = async (id: string, title: string) => {
    setActingId(id)
    try {
      await api.patch(`/api/admin/listings/${id}/verify`)
      toast.success(`"${title}" marked as legit`)
      await load()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Could not verify')
    } finally {
      setActingId(null)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    setActingId(id)
    try {
      await api.delete(`/api/listings/${id}`)
      toast.success('Listing deleted')
      setItems((prev) => prev.filter((l) => l._id !== id))
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Could not delete')
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="px-8 py-8 max-w-[1100px]">
      <div className="mb-6">
        <h1 className="font-display font-extrabold text-[28px] text-gray-800 tracking-[-0.5px]">
          Reported Listings
          {!loading && (
            <span className="text-gray-400 font-medium ml-2">({items.length})</span>
          )}
        </h1>
        <p className="text-[14px] text-gray-600 mt-1">
          Listings flagged by users. Each report shows the reporter and reason.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-gray-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-lg p-10 text-center">
          <div className="w-14 h-14 mx-auto mb-3 bg-primary-subtle rounded-full flex items-center justify-center">
            <ShieldCheck size={22} className="text-primary" />
          </div>
          <h3 className="font-display font-bold text-[16px] text-gray-800 mb-1">
            No reports
          </h3>
          <p className="text-[13.5px] text-gray-600 max-w-[320px] mx-auto leading-[1.6]">
            Nothing flagged. The community is behaving — for now.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((l) => {
            const owner = typeof l.ownerId === 'object' ? (l.ownerId as User) : null
            const isExpanded = expanded[l._id]
            return (
              <div
                key={l._id}
                className="bg-white border border-gray-100 rounded-lg shadow-card overflow-hidden"
              >
                <div className="p-4 flex gap-4 items-start flex-wrap">
                  {/* Thumbnail */}
                  <div className="w-24 h-20 rounded-md overflow-hidden flex-shrink-0 bg-gray-100">
                    {l.images?.[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={l.images[0]}
                        alt={l.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Body */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="bg-red-50 text-red-700 rounded-full text-[11px] font-bold px-2.5 py-0.5 flex items-center gap-1">
                        <AlertTriangle size={10} strokeWidth={3} />
                        {l.reports.length} report{l.reports.length === 1 ? '' : 's'}
                      </span>
                      {l.isVerified && (
                        <span className="text-[10px] font-bold text-dark-mid bg-primary-subtle px-2 py-0.5 rounded-full">
                          Verified
                        </span>
                      )}
                      {!l.isAvailable && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          Unavailable
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/listings/${l._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-display font-bold text-[15.5px] text-gray-800 hover:text-primary transition-colors block truncate"
                    >
                      {l.title}
                    </Link>

                    <div className="text-[12.5px] text-gray-400 mt-1 truncate">
                      {l.location.area}, {l.location.district}
                    </div>

                    {owner && (
                      <div className="text-[12.5px] text-gray-600 mt-1">
                        Owner:{' '}
                        <span className="font-medium text-gray-800">{owner.name}</span>
                        <span className="text-gray-400 ml-1.5">{owner.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="flex gap-1.5">
                      <Link
                        href={`/listings/${l._id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="View"
                        className="w-9 h-9 bg-white border border-gray-200 rounded-sm flex items-center justify-center text-gray-600 hover:border-primary hover:text-primary transition-colors"
                      >
                        <Eye size={14} />
                      </Link>
                      {l.isVerified ? (
                        <button
                          type="button"
                          onClick={() => handleUnverify(l._id, l.title)}
                          disabled={actingId === l._id}
                          aria-label="Unverify"
                          className="w-9 h-9 bg-white border border-gray-200 rounded-sm flex items-center justify-center text-gray-600 hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
                        >
                          <ShieldOff size={14} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleVerify(l._id, l.title)}
                          disabled={actingId === l._id}
                          aria-label="Verify"
                          className="w-9 h-9 bg-white border border-gray-200 rounded-sm flex items-center justify-center text-gray-600 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                        >
                          <ShieldCheck size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(l._id, l.title)}
                        disabled={actingId === l._id}
                        aria-label="Delete"
                        className="w-9 h-9 bg-white border border-gray-200 rounded-sm flex items-center justify-center text-gray-600 hover:border-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        {actingId === l._id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expandable reports detail */}
                <button
                  type="button"
                  onClick={() => setExpanded((p) => ({ ...p, [l._id]: !p[l._id] }))}
                  className="w-full px-4 py-2.5 border-t border-gray-100 text-left flex items-center justify-between text-[12.5px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {isExpanded ? 'Hide reasons' : `View ${l.reports.length} reason${l.reports.length === 1 ? '' : 's'}`}
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {isExpanded && (
                  <ul className="bg-gray-50 border-t border-gray-100 px-4 py-3 list-none space-y-2.5">
                    {l.reports.map((r, i) => {
                      const reporter = typeof r.userId === 'object' ? (r.userId as User) : null
                      return (
                        <li key={i} className="border-l-[3px] border-red-300 pl-3 text-[13px]">
                          <div className="flex items-center gap-2 text-[11.5px] text-gray-500 mb-0.5">
                            <span className="font-semibold text-gray-700">
                              {reporter?.name || 'Anonymous'}
                            </span>
                            <span>•</span>
                            <span>{new Date(r.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-gray-700 leading-[1.5]">{r.reason}</p>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
