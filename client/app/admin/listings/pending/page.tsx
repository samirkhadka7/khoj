'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/axios'
import type { ApiResponse, Listing, ListingType, User } from '@/types'

const TYPE_LABEL: Record<ListingType, string> = {
  hostel: 'Hostel',
  room: 'Room',
  office: 'Office',
  business: 'Business',
}

const FALLBACK_GRADIENT: Record<ListingType, string> = {
  hostel: 'linear-gradient(135deg, #c8eddf 0%, #93d9bc 100%)',
  room: 'linear-gradient(135deg, #bdd6fb 0%, #89b8f7 100%)',
  office: 'linear-gradient(135deg, #faddaa 0%, #f5c46a 100%)',
  business: 'linear-gradient(135deg, #f5c8b8 0%, #d99a86 100%)',
}

const FALLBACK_EMOJI: Record<ListingType, string> = {
  hostel: '🏠',
  room: '🛏️',
  office: '💼',
  business: '🏪',
}

export default function PendingVerificationsPage() {
  const [items, setItems] = useState<Listing[]>([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const load = async (p = page) => {
    setLoading(true)
    try {
      const { data } = await api.get<ApiResponse<Listing[]>>(
        `/api/admin/listings/pending?page=${p}&limit=12`
      )
      if (data.success && data.data) {
        setItems(data.data)
        if (data.pagination)
          setPagination({
            page: data.pagination.page,
            pages: data.pagination.pages,
            total: data.pagination.total,
          })
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Failed to load pending listings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleVerify = async (id: string, title: string) => {
    setActingId(id)
    try {
      await api.patch(`/api/admin/listings/${id}/verify`)
      toast.success(`"${title}" verified — owner has been notified`)
      // Optimistically drop it from the queue
      setItems((prev) => prev.filter((l) => l._id !== id))
      setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }))
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Could not verify')
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="px-8 py-8 max-w-[1100px]">
      <div className="mb-6">
        <h1 className="font-display font-extrabold text-[28px] text-gray-800 tracking-[-0.5px]">
          Pending Verifications
          {!loading && (
            <span className="text-gray-400 font-medium ml-2">({pagination.total})</span>
          )}
        </h1>
        <p className="text-[14px] text-gray-600 mt-1">
          Oldest listings appear first. Verify after spot-checking the photos and address.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-gray-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-lg p-10 text-center">
          <div className="w-14 h-14 mx-auto mb-3 bg-primary-subtle rounded-full flex items-center justify-center">
            <Sparkles size={22} className="text-primary" />
          </div>
          <h3 className="font-display font-bold text-[16px] text-gray-800 mb-1">
            All caught up!
          </h3>
          <p className="text-[13.5px] text-gray-600 max-w-[320px] mx-auto leading-[1.6]">
            No listings waiting for verification.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((l) => {
              const owner = typeof l.ownerId === 'object' ? (l.ownerId as User) : null
              return (
                <div
                  key={l._id}
                  className="bg-white border border-gray-100 rounded-lg p-4 flex gap-4 items-start flex-wrap shadow-card"
                >
                  {/* Thumbnail */}
                  <div className="w-32 h-24 rounded-md overflow-hidden flex-shrink-0">
                    {l.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={l.images[0]}
                        alt={l.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-3xl"
                        style={{ background: FALLBACK_GRADIENT[l.type] }}
                      >
                        {FALLBACK_EMOJI[l.type]}
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-white bg-dark px-2 py-0.5 rounded-full">
                        {TYPE_LABEL[l.type]}
                      </span>
                      <span className="text-[11.5px] text-gray-400">
                        Submitted {new Date(l.createdAt).toLocaleDateString()}
                      </span>
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
                      {l.location.address}, {l.location.area}, {l.location.district}
                    </div>

                    {owner && (
                      <div className="text-[12.5px] text-gray-600 mt-1.5">
                        Owner:{' '}
                        <span className="font-medium text-gray-800">{owner.name}</span>
                        <span className="text-gray-400 ml-1.5">{owner.email}</span>
                      </div>
                    )}

                    <div className="text-[13px] text-gray-600 mt-2 line-clamp-2">
                      {l.description}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="font-display font-extrabold text-[18px] text-primary">
                      NPR {l.price.toLocaleString('en-IN')}
                      <span className="text-[11px] text-gray-400 font-normal">/mo</span>
                    </div>
                    <div className="flex gap-1.5">
                      <Link
                        href={`/listings/${l._id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-9 px-3 bg-white border-[1.5px] border-gray-200 rounded-sm text-[13px] font-semibold text-gray-800 hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
                      >
                        <Eye size={13} />
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleVerify(l._id, l.title)}
                        disabled={actingId === l._id}
                        className="h-9 px-4 bg-primary text-white border-none rounded-sm text-[13px] font-bold hover:bg-dark transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {actingId === l._id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <ShieldCheck size={13} strokeWidth={2.5} />
                        )}
                        Verify
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages}
                className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-sm text-gray-600 hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
