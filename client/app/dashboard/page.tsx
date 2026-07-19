'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquare,
  Plus,
  ShieldCheck,
  ShieldX,
  XCircle,
} from 'lucide-react'
import api from '@/lib/axios'
import { useDashboardUser } from '@/components/dashboard/DashboardContext'
import { ListingCard } from '@/components/listings/ListingCard'
import type { ApiResponse, ContactRequest, Kyc, Listing } from '@/types'

/**
 * Renders different content based on role:
 *   - user           → user home (browse + KYC banner)
 *   - owner / admin  → owner home (listing stats + recents)
 */
export default function DashboardHome() {
  const { user } = useDashboardUser()

  if (user.role === 'owner' || user.role === 'admin') return <OwnerHome />
  return <UserHome />
}

/* -------------------------------------------------------------------------- */

function UserHome() {
  const { user } = useDashboardUser()
  const [requests, setRequests] = useState<ContactRequest[]>([])
  const [recommended, setRecommended] = useState<Listing[]>([])
  const [kyc, setKyc] = useState<Kyc | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        // KYC may 404 silently if user hasn't applied — backend returns null in that case
        const [reqRes, listingsRes, kycRes] = await Promise.all([
          api.get<ApiResponse<ContactRequest[]>>('/api/contact-request/sent'),
          api.get<ApiResponse<Listing[]>>('/api/listings?limit=3'),
          api.get<ApiResponse<Kyc | null>>('/api/kyc/status'),
        ])
        if (cancelled) return
        if (reqRes.data.success && reqRes.data.data) setRequests(reqRes.data.data.slice(0, 3))
        if (listingsRes.data.success && listingsRes.data.data) setRecommended(listingsRes.data.data)
        if (kycRes.data.success) setKyc(kycRes.data.data ?? null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const accepted = requests.filter((r) => r.status === 'accepted')

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1100px]">
      {/* Welcome banner */}
      <section
        className="rounded-lg p-6 mb-6 flex items-center justify-between gap-6 flex-wrap"
        style={{
          background:
            'linear-gradient(135deg, var(--primary-subtle) 0%, rgba(29,158,117,0.08) 100%)',
          border: '1px solid rgba(29,158,117,0.18)',
        }}
      >
        <div>
          <h1 className="font-display font-extrabold text-[26px] text-dark tracking-[-0.4px]">
            Namaste, {user.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-[14px] text-dark-mid mt-1.5">
            {accepted.length > 0
              ? `You have ${accepted.length} accepted request${accepted.length > 1 ? 's' : ''} waiting`
              : 'Find your perfect space across Nepal — verified listings, no middlemen.'}
          </p>
        </div>
        <Link
          href={accepted.length > 0 ? '/dashboard/contact-requests' : '/listings'}
          className="inline-flex items-center gap-2 h-11 px-5 bg-primary text-white border-none rounded-sm font-display text-[14px] font-bold hover:bg-dark hover:-translate-y-px transition-all"
        >
          {accepted.length > 0 ? 'View Contact' : 'Find Space'}
          <ArrowRight size={14} strokeWidth={2.5} />
        </Link>
      </section>

      {/* KYC status / become-owner — only show after we know the KYC state */}
      {!loading && <KycCard kyc={kyc} />}

      {/* My Contact Requests */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-extrabold text-[20px] text-gray-800 tracking-[-0.2px]">
            My Contact Requests
          </h2>
          <Link
            href="/dashboard/contact-requests"
            className="text-[13px] text-primary font-semibold hover:text-dark transition-colors"
          >
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : requests.length === 0 ? (
          <EmptyCard
            icon={<MessageSquare size={20} className="text-gray-400" />}
            title="No requests yet"
            desc="Browse listings and request contact when you find a space you love."
            cta={{ href: '/listings', label: 'Browse Listings' }}
          />
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 grid-cols-1 gap-4">
            {requests.map((r) => (
              <RequestCard key={r._id} request={r} />
            ))}
          </div>
        )}
      </section>

      {/* Recommended */}
      {recommended.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-extrabold text-[20px] text-gray-800 tracking-[-0.2px]">
              Recommended for you
            </h2>
            <Link
              href="/listings"
              className="text-[13px] text-primary font-semibold hover:text-dark transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 grid-cols-1 gap-5">
            {recommended.map((l) => (
              <ListingCard key={l._id} listing={l} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function OwnerHome() {
  const { user } = useDashboardUser()
  const [stats, setStats] = useState({
    listings: 0,
    views: 0,
    pending: 0,
    accepted: 0,
  })
  const [recent, setRecent] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [listRes, reqRes] = await Promise.all([
          api.get<ApiResponse<Listing[]>>('/api/listings/owner/my-listings'),
          api.get<ApiResponse<ContactRequest[]>>('/api/contact-request/received'),
        ])
        if (cancelled) return
        if (listRes.data.success && listRes.data.data) {
          const listings = listRes.data.data
          setRecent(listings.slice(0, 3))
          setStats((s) => ({
            ...s,
            listings: listings.length,
            views: listings.reduce((sum, l) => sum + (l.viewCount || 0), 0),
          }))
        }
        if (reqRes.data.success && reqRes.data.data) {
          const reqs = reqRes.data.data
          setStats((s) => ({
            ...s,
            pending: reqs.filter((r) => r.status === 'pending').length,
            accepted: reqs.filter((r) => r.status === 'accepted').length,
          }))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1100px]">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-extrabold text-[26px] text-gray-800 tracking-[-0.4px]">
            Welcome back, {user.name.split(' ')[0]}
          </h1>
          <p className="text-[14px] text-gray-600 mt-1">Here&apos;s how your listings are doing.</p>
        </div>
        <Link
          href="/dashboard/my-listings/new"
          className="inline-flex items-center gap-2 h-11 px-5 bg-primary text-white border-none rounded-sm font-display text-[14px] font-bold hover:bg-dark hover:-translate-y-px transition-all"
        >
          <Plus size={14} strokeWidth={2.5} />
          Add New Listing
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 grid-cols-1 gap-4 mb-8">
        <StatCard label="Total Listings" value={stats.listings} loading={loading} />
        <StatCard label="Total Views" value={stats.views} loading={loading} />
        <StatCard label="Pending Requests" value={stats.pending} loading={loading} accent />
        <StatCard label="Accepted" value={stats.accepted} loading={loading} />
      </div>

      {/* Recent listings */}
      {recent.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-extrabold text-[20px] text-gray-800 tracking-[-0.2px]">
              Recent Listings
            </h2>
            <Link
              href="/dashboard/my-listings"
              className="text-[13px] text-primary font-semibold hover:text-dark transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 grid-cols-1 gap-5">
            {recent.map((l) => (
              <ListingCard key={l._id} listing={l} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                             */
/* -------------------------------------------------------------------------- */

function StatCard({
  label,
  value,
  loading,
  accent,
}: {
  label: string
  value: number
  loading: boolean
  accent?: boolean
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-card">
      <div className="text-[12px] font-bold text-gray-400 uppercase tracking-[0.6px] mb-1.5">
        {label}
      </div>
      <div
        className={`font-display font-extrabold text-[28px] tracking-[-0.5px] ${
          accent ? 'text-accent' : 'text-dark'
        }`}
      >
        {loading ? '—' : value.toLocaleString('en-IN')}
      </div>
    </div>
  )
}

function EmptyCard({
  icon,
  title,
  desc,
  cta,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  cta: { href: string; label: string }
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg p-8 text-center">
      <div className="w-14 h-14 mx-auto mb-3 bg-gray-50 rounded-full flex items-center justify-center">
        {icon}
      </div>
      <h3 className="font-display font-bold text-[16px] text-gray-800 mb-1.5">{title}</h3>
      <p className="text-[13.5px] text-gray-600 max-w-[320px] mx-auto mb-4 leading-[1.6]">
        {desc}
      </p>
      <Link
        href={cta.href}
        className="inline-flex items-center gap-1.5 h-9 px-4 bg-primary text-white rounded-sm font-semibold text-[13px] hover:bg-dark transition-colors"
      >
        {cta.label}
        <ArrowRight size={13} strokeWidth={2.5} />
      </Link>
    </div>
  )
}

const STATUS_STYLES: Record<
  ContactRequest['status'],
  { border: string; bg: string; label: string; Icon: typeof Clock }
> = {
  pending: {
    border: 'border-l-[4px] border-l-accent-light',
    bg: 'bg-accent-subtle/40',
    label: 'Awaiting Response',
    Icon: Clock,
  },
  accepted: {
    border: 'border-l-[4px] border-l-primary',
    bg: 'bg-primary-subtle/40',
    label: 'Request Accepted',
    Icon: CheckCircle2,
  },
  rejected: {
    border: 'border-l-[4px] border-l-gray-300',
    bg: 'bg-gray-50',
    label: 'Request Declined',
    Icon: XCircle,
  },
  expired: {
    border: 'border-l-[4px] border-l-gray-300',
    bg: 'bg-gray-50',
    label: 'Request Expired',
    Icon: XCircle,
  },
}

function RequestCard({ request }: { request: ContactRequest }) {
  const status = STATUS_STYLES[request.status]
  const listing = typeof request.listingId === 'object' ? request.listingId : null
  const Icon = status.Icon

  return (
    <Link
      href="/dashboard/contact-requests"
      className={`block bg-white border border-gray-100 rounded-lg overflow-hidden ${status.border} hover:shadow-md transition-shadow no-underline`}
    >
      <div className={`p-4 ${status.bg}`}>
        <div className="flex items-center gap-2 text-[12.5px] font-bold text-gray-700">
          <Icon size={14} strokeWidth={2.5} />
          {status.label}
        </div>
      </div>
      <div className="p-4">
        <div className="font-display font-bold text-[14.5px] text-gray-800 truncate mb-0.5">
          {listing?.title || 'Listing'}
        </div>
        {listing?.location && (
          <div className="text-[12.5px] text-gray-400 truncate">
            {listing.location.area}, {listing.location.district}
          </div>
        )}
        <div className="text-[11.5px] text-gray-400 mt-2">
          Sent {new Date(request.createdAt).toLocaleDateString()}
        </div>
      </div>
    </Link>
  )
}

/* -------------------------------------------------------------------------- */
/*  KycCard                                                                    */
/*  Renders one of four states based on the user's KYC application:           */
/*    null      → "Become an owner" pitch                                      */
/*    pending   → "Under review" with submitted timestamp                      */
/*    approved  → "Verified Owner" + Add First Listing CTA                     */
/*    rejected  → reason + Resubmit CTA                                        */
/* -------------------------------------------------------------------------- */

function KycCard({ kyc }: { kyc: Kyc | null }) {
  if (!kyc) {
    // Not applied yet — pitch
    return (
      <section
        className="rounded-lg p-6 mb-8 flex items-center justify-between gap-6 flex-wrap"
        style={{
          background:
            'linear-gradient(135deg, var(--accent-subtle) 0%, rgba(186,117,23,0.08) 100%)',
          border: '1px solid rgba(186,117,23,0.20)',
        }}
      >
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-11 h-11 rounded-md bg-accent/15 flex items-center justify-center text-accent flex-shrink-0">
            <ShieldCheck size={20} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <div className="font-display font-extrabold text-[18px] text-gray-800">
              Want to list your property?
            </div>
            <p className="text-[13px] text-gray-600 mt-0.5 leading-[1.5] max-w-[420px]">
              Become a verified owner — submit KYC documents and our admin team will review
              within 24-48 hours.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/become-owner"
          className="inline-flex items-center gap-2 h-11 px-5 bg-primary text-white border-none rounded-sm font-display text-[14px] font-bold hover:bg-dark hover:-translate-y-px transition-all flex-shrink-0"
        >
          Apply for Owner Access
          <ArrowRight size={14} strokeWidth={2.5} />
        </Link>
      </section>
    )
  }

  if (kyc.status === 'pending') {
    return (
      <section className="rounded-lg p-5 mb-8 bg-accent-subtle/60 border-l-[4px] border-l-accent-light flex items-center justify-between gap-6 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
            <Clock size={16} className="text-accent" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-bold text-[14px] text-accent">
                KYC Under Review
              </span>
              <span className="text-[10.5px] font-bold uppercase tracking-[0.5px] text-accent bg-accent/15 px-2 py-0.5 rounded-full">
                Pending
              </span>
            </div>
            <p className="text-[12.5px] text-gray-600 mt-1">
              Submitted {new Date(kyc.submittedAt).toLocaleString()}. Admin reviews within
              24-48 hours.
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (kyc.status === 'approved') {
    return (
      <section className="rounded-lg p-5 mb-8 bg-primary-subtle/60 border-l-[4px] border-l-primary flex items-center justify-between gap-6 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={16} className="text-primary" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-bold text-[14px] text-dark-mid">
                Verified Owner
              </span>
              <span className="text-[10.5px] font-bold uppercase tracking-[0.5px] text-dark-mid bg-primary/20 px-2 py-0.5 rounded-full">
                Approved
              </span>
            </div>
            <p className="text-[12.5px] text-gray-600 mt-1">
              You can now list properties. Refresh to see your new owner sidebar.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/my-listings/new"
          className="inline-flex items-center gap-2 h-10 px-5 bg-primary text-white border-none rounded-sm font-display text-[13.5px] font-bold hover:bg-dark transition-all flex-shrink-0"
        >
          <Plus size={14} strokeWidth={2.5} />
          Add First Listing
        </Link>
      </section>
    )
  }

  // rejected
  return (
    <section className="rounded-lg p-5 mb-8 bg-red-50 border-l-[4px] border-l-red-400 flex items-center justify-between gap-6 flex-wrap">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <ShieldX size={16} className="text-red-600" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-bold text-[14px] text-red-700">
              KYC Rejected
            </span>
            <span className="text-[10.5px] font-bold uppercase tracking-[0.5px] text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
              Rejected
            </span>
          </div>
          {kyc.rejectionReason && (
            <p className="text-[12.5px] text-gray-700 mt-1">
              <span className="font-semibold">Reason:</span> {kyc.rejectionReason}
            </p>
          )}
        </div>
      </div>
      <Link
        href="/dashboard/become-owner"
        className="inline-flex items-center gap-2 h-10 px-5 bg-white border-[1.5px] border-red-300 text-red-700 rounded-sm font-display text-[13.5px] font-bold hover:bg-red-100 transition-colors flex-shrink-0"
      >
        Resubmit KYC
      </Link>
    </section>
  )
}
