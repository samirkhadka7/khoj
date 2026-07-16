'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Check,
  Edit3,
  Eye,
  Heart,
  Home as HomeIcon,
  KeyRound,
  Loader2,
  MapPin,
  Plus,
  Star,
  Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/axios'
import { useDashboardUser } from '@/components/dashboard/DashboardContext'
import type { ApiResponse, Listing, ListingType } from '@/types'

const TYPE_LABEL: Record<ListingType, string> = {
  hostel: 'Hostel',
  room: 'Room / Flat',
  office: 'Office',
  business: 'Business',
}

const FALLBACK_GRADIENTS: Record<ListingType, string> = {
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

export default function MyListingsPage() {
  const { user } = useDashboardUser()
  const isOwner = user.role === 'owner' || user.role === 'admin'

  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get<ApiResponse<Listing[]>>('/api/listings/owner/my-listings')
      if (data.success && data.data) setListings(data.data)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Failed to load listings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isOwner) {
      setLoading(false)
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner])

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      await api.delete(`/api/listings/${id}`)
      toast.success('Listing deleted')
      setListings((prev) => prev.filter((l) => l._id !== id))
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Could not delete')
    } finally {
      setDeletingId(null)
    }
  }

  /** Toggle availability: "Mark as Rented" (isAvailable → false) / "Mark Available". */
  const handleToggleRented = async (id: string, current: boolean) => {
    setTogglingId(id)
    try {
      const next = !current
      const { data } = await api.put<ApiResponse<Listing>>(`/api/listings/${id}`, {
        isAvailable: next,
      })
      if (data.success && data.data) {
        setListings((prev) => prev.map((l) => (l._id === id ? data.data! : l)))
        toast.success(next ? 'Marked as available' : 'Marked as rented — hidden from search')
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Could not update status')
    } finally {
      setTogglingId(null)
    }
  }

  if (!isOwner) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="bg-white border border-gray-100 rounded-lg p-10 text-center">
          <h1 className="font-display font-bold text-[20px] text-gray-800 mb-2">
            Owner-only area
          </h1>
          <p className="text-[14px] text-gray-600">
            Switch to an owner account to list properties.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1100px]">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-extrabold text-[26px] text-gray-800 tracking-[-0.4px]">
            My Listings
            {listings.length > 0 && (
              <span className="text-gray-400 font-medium ml-2">({listings.length})</span>
            )}
          </h1>
          <p className="text-[14px] text-gray-600 mt-1">
            Manage your properties — edit details, track views, or remove listings.
          </p>
        </div>
        <Link
          href="/dashboard/my-listings/new"
          className="inline-flex items-center gap-2 h-11 px-5 bg-primary text-white border-none rounded-sm font-display text-[14px] font-bold hover:bg-dark hover:-translate-y-px transition-all"
        >
          <Plus size={14} strokeWidth={2.5} />
          Add New Listing
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={28} className="animate-spin text-gray-400" />
        </div>
      ) : listings.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-lg p-10 text-center">
          <div className="w-14 h-14 mx-auto mb-3 bg-gray-50 rounded-full flex items-center justify-center">
            <HomeIcon size={24} className="text-gray-400" />
          </div>
          <h3 className="font-display font-bold text-[16px] text-gray-800 mb-1.5">
            No listings yet
          </h3>
          <p className="text-[13.5px] text-gray-600 max-w-[320px] mx-auto mb-4 leading-[1.6]">
            Post your first property and start receiving contact requests.
          </p>
          <Link
            href="/dashboard/my-listings/new"
            className="inline-flex items-center gap-1.5 h-9 px-4 bg-primary text-white rounded-sm font-semibold text-[13px] hover:bg-dark transition-colors"
          >
            <Plus size={13} strokeWidth={2.5} />
            Post your first listing
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => (
            <div
              key={l._id}
              className="bg-white border border-gray-100 rounded-lg p-4 flex gap-4 items-start flex-wrap shadow-card"
            >
              {/* Thumbnail */}
              <Link
                href={`/listings/${l._id}`}
                className="w-32 h-24 rounded-md overflow-hidden flex-shrink-0 relative"
              >
                {l.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.images[0]} alt={l.title} className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-3xl"
                    style={{ background: FALLBACK_GRADIENTS[l.type] }}
                  >
                    {FALLBACK_EMOJI[l.type]}
                  </div>
                )}
              </Link>

              {/* Body */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-white bg-dark px-2 py-0.5 rounded-full">
                    {TYPE_LABEL[l.type]}
                  </span>
                  {l.isVerified && (
                    <span className="text-[10px] font-bold text-dark-mid bg-primary-subtle px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <Check size={9} strokeWidth={3} />
                      Verified
                    </span>
                  )}
                  {!l.isAvailable && (
                    <span className="text-[10px] font-bold text-accent bg-accent-subtle px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <KeyRound size={9} strokeWidth={2.5} />
                      Rented
                    </span>
                  )}
                  {l.isFeatured && (
                    <span className="text-[10px] font-bold text-accent bg-accent-subtle px-2 py-0.5 rounded-full">
                      Featured
                    </span>
                  )}
                </div>

                <Link
                  href={`/listings/${l._id}`}
                  className="font-display font-bold text-[15.5px] text-gray-800 hover:text-primary transition-colors block truncate"
                >
                  {l.title}
                </Link>

                <div className="flex items-center gap-1 text-[12.5px] text-gray-400 mt-1">
                  <MapPin size={11} />
                  {l.location.area}, {l.location.district}
                </div>

                <div className="flex items-center gap-4 text-[12px] text-gray-600 mt-2 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Eye size={12} className="text-gray-400" />
                    {l.viewCount} views
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart size={12} className="text-gray-400" />
                    {l.wishlistedBy?.length || 0} saves
                  </span>
                  <span className="flex items-center gap-1">
                    <Star size={11} className="fill-accent-light stroke-accent-light" />
                    {l.averageRating > 0 ? l.averageRating.toFixed(1) : 'No reviews'}
                  </span>
                </div>
              </div>

              {/* Right column: price + actions */}
              <div className="flex flex-col items-start sm:items-end gap-2 flex-shrink-0 w-full sm:w-auto">
                <div className="font-display font-extrabold text-[18px] text-primary">
                  NPR {l.price.toLocaleString('en-IN')}
                  <span className="text-[11px] text-gray-400 font-normal">/mo</span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {/* Mark as Rented / Available */}
                  <button
                    type="button"
                    onClick={() => handleToggleRented(l._id, l.isAvailable)}
                    disabled={togglingId === l._id}
                    className={`h-8 px-3 rounded-full border text-[12px] font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50 ${
                      l.isAvailable
                        ? 'bg-white border-gray-200 text-gray-700 hover:border-accent hover:text-accent'
                        : 'bg-accent-subtle border-accent-light/40 text-accent hover:bg-accent-subtle/70'
                    }`}
                  >
                    {togglingId === l._id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : l.isAvailable ? (
                      <KeyRound size={12} strokeWidth={2.5} />
                    ) : (
                      <Check size={12} strokeWidth={3} />
                    )}
                    {l.isAvailable ? 'Mark as Rented' : 'Mark Available'}
                  </button>
                  <Link
                    href={`/listings/${l._id}`}
                    aria-label="View"
                    className="w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:border-primary hover:text-primary transition-colors"
                  >
                    <Eye size={13} />
                  </Link>
                  <Link
                    href={`/dashboard/my-listings/${l._id}/edit`}
                    aria-label="Edit"
                    className="w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:border-primary hover:text-primary transition-colors"
                  >
                    <Edit3 size={13} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(l._id, l.title)}
                    disabled={deletingId === l._id}
                    aria-label="Delete"
                    className="w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:border-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    {deletingId === l._id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Owner CTA bottom */}
      {!loading && listings.length > 0 && (
        <Link
          href="/dashboard/contact-requests"
          className="mt-6 bg-primary-subtle/40 border border-primary/20 rounded-lg p-4 flex items-center justify-between hover:bg-primary-subtle/60 transition-colors no-underline"
        >
          <div>
            <div className="font-display font-bold text-[15px] text-dark mb-0.5">
              Check your inbox
            </div>
            <div className="text-[13px] text-dark-mid">
              See pending contact requests from interested tenants.
            </div>
          </div>
          <ArrowRight size={18} className="text-primary flex-shrink-0" />
        </Link>
      )}
    </div>
  )
}
