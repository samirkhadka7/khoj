'use client'

import { useEffect, useState } from 'react'
import {
  ArrowUpDown,
  Bell,
  BookOpen,
  Car,
  Check,
  Clock,
  CookingPot,
  Droplets,
  GlassWater,
  Home,
  Loader2,
  ShieldCheck,
  Snowflake,
  Star,
  Sun,
  Utensils,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import api from '@/lib/axios'
import type { ApiResponse, Listing, User } from '@/types'

/* -------------------------------------------------------------------------- */
/*  Amenity → icon map (Stitch shows each amenity in an icon tile)            */
/* -------------------------------------------------------------------------- */

const AMENITY_ICONS: Record<string, LucideIcon> = {
  WiFi: Wifi,
  'Hot Water': Droplets,
  Parking: Car,
  AC: Snowflake,
  Meals: Utensils,
  Laundry: Home,
  'Security/CCTV': ShieldCheck,
  Generator: Zap,
  'Drinking Water': GlassWater,
  Solar: Sun,
  'Study Room': BookOpen,
  Elevator: ArrowUpDown,
  '24/7 Access': Clock,
  Kitchen: CookingPot,
  Balcony: Home,
  Reception: Bell,
}

/* -------------------------------------------------------------------------- */
/*  Key stats — 3 headline numbers derived from the listing's type fields     */
/* -------------------------------------------------------------------------- */

export function KeyStats({ listing }: { listing: Listing }) {
  const tf = listing.typeFields as unknown as Record<string, unknown>
  const stats: { label: string; value: string }[] = []

  const push = (label: string, value: unknown) => {
    if (value !== undefined && value !== null && value !== '') {
      stats.push({ label, value: String(value) })
    }
  }

  if (listing.type === 'hostel') {
    push('Room Type', cap(tf.roomType))
    push('Total Beds', tf.totalBeds)
    push('Gender', cap(tf.gender))
  } else if (listing.type === 'room') {
    push('Type', tf.bhkType)
    push('Furnished', cap(String(tf.furnished ?? '').replace('-', ' ')))
    if (tf.sqft) push('Floor Area', `${tf.sqft} sq.ft`)
    else push('Min Stay', tf.minStayMonths ? `${tf.minStayMonths} mo` : undefined)
  } else if (listing.type === 'office') {
    push('Floor Area', tf.sqft ? `${tf.sqft} sq.ft` : undefined)
    push('Type', cap(tf.officeType))
    push('Meeting Rooms', tf.meetingRooms)
  } else if (listing.type === 'business') {
    push('Floor Area', tf.sqft ? `${tf.sqft} sq.ft` : undefined)
    push('Space', cap(tf.spaceType))
    push('Foot Traffic', cap(tf.footTraffic))
  }

  // Always end with availability so there are exactly 3 cells where possible
  if (stats.length < 3) {
    stats.push({ label: 'Availability', value: listing.isAvailable ? 'Immediate' : 'Occupied' })
  }
  const shown = stats.slice(0, 3)

  return (
    <div className="grid grid-cols-3 gap-4 p-6 bg-primary-subtle/40 rounded-lg border border-gray-200/60">
      {shown.map((s, i) => (
        <div
          key={s.label}
          className={`text-center ${i === 1 && shown.length === 3 ? 'border-x border-gray-200/70' : ''}`}
        >
          <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-1">
            {s.label}
          </p>
          <p className="text-[18px] sm:text-[20px] font-bold text-dark tracking-tight">{s.value}</p>
        </div>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Amenities grid — icon tiles                                               */
/* -------------------------------------------------------------------------- */

export function AmenitiesGrid({ amenities }: { amenities: string[] }) {
  if (!amenities.length) return null
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
      {amenities.map((a) => {
        const Icon = AMENITY_ICONS[a] ?? Check
        return (
          <div key={a} className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-primary-subtle rounded-lg text-primary flex-shrink-0">
              <Icon size={18} strokeWidth={2} />
            </div>
            <span className="text-[14px] text-gray-700">{a}</span>
          </div>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Space details — striped 2-col table from typeFields                       */
/* -------------------------------------------------------------------------- */

export function SpaceDetailsTable({ listing }: { listing: Listing }) {
  const tf = listing.typeFields as unknown as Record<string, unknown>
  if (!tf) return null

  const entries = Object.entries(tf).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  )
  if (entries.length === 0) return null

  return (
    <div className="border border-gray-200/70 rounded-lg overflow-hidden bg-white shadow-card">
      {entries.map(([k, v], i) => (
        <div
          key={k}
          className={`grid grid-cols-2 ${i < entries.length - 1 ? 'border-b border-gray-100' : ''}`}
        >
          <div className="p-4 bg-gray-50 text-[13.5px] font-semibold text-gray-500">
            {labelize(k)}
          </div>
          <div className="p-4 text-[13.5px] text-gray-800 font-medium">{formatVal(v)}</div>
        </div>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Reviews — score + rating bars + cards (fetched live)                      */
/* -------------------------------------------------------------------------- */

interface Review {
  _id: string
  rating: number
  comment?: string
  createdAt: string
  tenantId: string | User
}

export function ReviewsSection({ listing }: { listing: Listing }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await api.get<ApiResponse<Review[]>>(
          `/api/reviews/listing/${listing._id}?limit=6`
        )
        if (!cancelled && data.success && data.data) setReviews(data.data)
      } catch {
        // reviews are non-critical — fail silently
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [listing._id])

  const avg = listing.averageRating || 0
  const total = listing.totalReviews || 0

  // Distribution from the loaded sample (or fall back to a single full bar at avg)
  const dist = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => Math.round(r.rating) === star).length
    const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0
    return { star, pct }
  })

  return (
    <section className="pb-4">
      <h2 className="text-[22px] font-bold text-dark tracking-tight mb-6">Reviews</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <div className="flex flex-col items-center justify-center p-8 bg-primary-subtle/40 rounded-lg border border-gray-200/50">
          <span className="text-[48px] font-extrabold text-dark leading-none">
            {avg > 0 ? avg.toFixed(1) : '—'}
          </span>
          <div className="flex text-accent-light my-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                size={18}
                className={i <= Math.round(avg) ? 'fill-accent-light stroke-accent-light' : 'stroke-gray-300'}
              />
            ))}
          </div>
          <span className="text-[12px] text-gray-400 font-medium">
            {total > 0 ? `Total ${total} review${total === 1 ? '' : 's'}` : 'No reviews yet'}
          </span>
        </div>

        <div className="md:col-span-2 space-y-3 py-4">
          {dist.map((d) => (
            <div key={d.star} className="flex items-center gap-4">
              <span className="w-12 text-[12px] font-medium text-gray-400">{d.star} Star</span>
              <div className="flex-1 h-2.5 bg-primary-subtle rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${d.pct}%` }} />
              </div>
              <span className="w-10 text-right text-[12px] font-medium text-gray-400">{d.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={22} className="animate-spin text-gray-300" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-[14px] text-gray-400">
          Be the first to review after your contact request is accepted.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.map((r) => {
            const reviewer = typeof r.tenantId === 'object' ? (r.tenantId as User) : null
            return (
              <div
                key={r._id}
                className="p-6 bg-white border border-gray-200/70 rounded-lg shadow-card"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-11 h-11 bg-primary-subtle rounded-full flex items-center justify-center text-primary font-bold overflow-hidden flex-shrink-0">
                    {reviewer?.profilePhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={reviewer.profilePhoto} alt={reviewer.name} className="w-full h-full object-cover" />
                    ) : (
                      (reviewer?.name?.[0] ?? 'U').toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[14px] font-semibold text-gray-800 truncate">
                      {reviewer?.name ?? 'Tenant'}
                    </h4>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          size={11}
                          className={i <= r.rating ? 'fill-accent-light stroke-accent-light' : 'stroke-gray-300'}
                        />
                      ))}
                      <span className="text-[11px] text-gray-400 ml-1">
                        {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
                {r.comment && <p className="text-[13.5px] text-gray-600 leading-relaxed">{r.comment}</p>}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  BaasKhoj Trust card — dark green panel in the sidebar                      */
/* -------------------------------------------------------------------------- */

export function TrustCard() {
  return (
    <div className="bg-dark p-6 rounded-xl text-white">
      <div className="flex items-start gap-4">
        <ShieldCheck size={30} strokeWidth={2} className="flex-shrink-0 text-brand-fg" />
        <div>
          <h4 className="text-[17px] font-bold mb-1">BaasKhoj Trust</h4>
          <p className="text-[13px] text-white/70 leading-relaxed">
            This listing is manually verified by our team. We guarantee price transparency and safe,
            middleman-free transactions.
          </p>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  helpers                                                                    */
/* -------------------------------------------------------------------------- */

function cap(v: unknown): string {
  const s = String(v ?? '')
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}

function labelize(k: string): string {
  return k
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

function formatVal(v: unknown): string {
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (typeof v === 'number') return v.toLocaleString('en-IN')
  return String(v)
}
