'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  Home,
  Loader2,
  MessageSquare,
  Star,
  UserX,
  Users,
} from 'lucide-react'
import api from '@/lib/axios'
import type { ApiResponse } from '@/types'

interface AdminStats {
  users: { total: number; banned: number }
  listings: { total: number; pendingVerification: number; reported: number }
  contactRequests: { total: number; accepted: number }
  reviews: { total: number }
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await api.get<ApiResponse<AdminStats>>('/api/admin/stats')
        if (!cancelled && data.success && data.data) setStats(data.data)
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
    <div className="px-8 py-8 max-w-[1100px]">
      <div className="mb-7">
        <h1 className="font-display font-extrabold text-[28px] text-gray-800 tracking-[-0.5px]">
          Admin Dashboard
        </h1>
        <p className="text-[14px] text-gray-600 mt-1">
          Overview of BaasKhoj activity. Critical actions are surfaced as cards below.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="text-gray-400 animate-spin" />
        </div>
      ) : !stats ? (
        <div className="bg-white border border-gray-100 rounded-lg p-8 text-center text-gray-600">
          Could not load stats.
        </div>
      ) : (
        <>
          {/* Top row — 4 high-value counts */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 grid-cols-1 gap-4 mb-7">
            <StatCard
              label="Total Users"
              value={stats.users.total}
              icon={<Users size={18} />}
              accent={false}
            />
            <StatCard
              label="Total Listings"
              value={stats.listings.total}
              icon={<Home size={18} />}
              accent={false}
            />
            <StatCard
              label="Contact Requests"
              value={stats.contactRequests.total}
              icon={<MessageSquare size={18} />}
              accent={false}
            />
            <StatCard
              label="Reviews"
              value={stats.reviews.total}
              icon={<Star size={18} />}
              accent={false}
            />
          </div>

          {/* Action cards — things admin actually does */}
          <h2 className="font-display font-bold text-[16px] text-gray-800 mb-3 mt-2">
            Action Items
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 grid-cols-1 gap-4">
            <ActionCard
              href="/admin/listings/pending"
              count={stats.listings.pendingVerification}
              label="Pending Verifications"
              description="Listings waiting to be marked verified"
              tone="primary"
              icon={<ClipboardCheck size={20} strokeWidth={2.2} />}
            />
            <ActionCard
              href="/admin/reports"
              count={stats.listings.reported}
              label="Reported Listings"
              description="Listings flagged by users for review"
              tone="accent"
              icon={<AlertTriangle size={20} strokeWidth={2.2} />}
            />
            <ActionCard
              href="/admin/users?banned=true"
              count={stats.users.banned}
              label="Banned Users"
              description="Active bans in effect"
              tone="muted"
              icon={<UserX size={20} strokeWidth={2.2} />}
            />
          </div>

          {/* Secondary stats */}
          <div className="mt-8 grid sm:grid-cols-2 grid-cols-1 gap-4">
            <SecondaryStat
              label="Acceptance rate"
              value={
                stats.contactRequests.total > 0
                  ? `${Math.round(
                      (stats.contactRequests.accepted / stats.contactRequests.total) * 100
                    )}%`
                  : '—'
              }
              hint={`${stats.contactRequests.accepted.toLocaleString('en-IN')} accepted of ${stats.contactRequests.total.toLocaleString('en-IN')} total`}
            />
            <SecondaryStat
              label="Verified rate"
              value={
                stats.listings.total > 0
                  ? `${Math.round(
                      ((stats.listings.total - stats.listings.pendingVerification) /
                        stats.listings.total) *
                        100
                    )}%`
                  : '—'
              }
              hint={`${(stats.listings.total - stats.listings.pendingVerification).toLocaleString('en-IN')} verified of ${stats.listings.total.toLocaleString('en-IN')} total`}
            />
          </div>
        </>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: number
  icon: React.ReactNode
  accent: boolean
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-card">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[12px] font-bold text-gray-400 uppercase tracking-[0.6px]">
          {label}
        </div>
        <div className={`text-${accent ? 'accent' : 'gray-300'}`}>{icon}</div>
      </div>
      <div
        className={`font-display font-extrabold text-[28px] tracking-[-0.5px] ${
          accent ? 'text-accent' : 'text-dark'
        }`}
      >
        {value.toLocaleString('en-IN')}
      </div>
    </div>
  )
}

const TONE_CLS = {
  primary: {
    bg: 'bg-primary-subtle/60 border-primary/20',
    text: 'text-dark',
    sub: 'text-dark-mid',
    icon: 'bg-primary text-white',
  },
  accent: {
    bg: 'bg-accent-subtle/70 border-accent-light/30',
    text: 'text-accent',
    sub: 'text-[#8a5a10]',
    icon: 'bg-accent text-white',
  },
  muted: {
    bg: 'bg-gray-50 border-gray-200',
    text: 'text-gray-800',
    sub: 'text-gray-600',
    icon: 'bg-gray-700 text-white',
  },
} as const

function ActionCard({
  href,
  count,
  label,
  description,
  tone,
  icon,
}: {
  href: string
  count: number
  label: string
  description: string
  tone: keyof typeof TONE_CLS
  icon: React.ReactNode
}) {
  const t = TONE_CLS[tone]
  return (
    <Link
      href={href}
      className={`block rounded-lg border p-5 transition-all hover:-translate-y-px hover:shadow-md no-underline ${t.bg}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-md flex items-center justify-center ${t.icon}`}>
          {icon}
        </div>
        <ArrowRight size={16} className={t.text} />
      </div>
      <div className={`font-display font-extrabold text-[26px] tracking-[-0.5px] ${t.text}`}>
        {count.toLocaleString('en-IN')}
      </div>
      <div className={`font-display font-bold text-[14px] ${t.text} mt-1`}>{label}</div>
      <p className={`text-[12.5px] ${t.sub} mt-1 leading-[1.5]`}>{description}</p>
    </Link>
  )
}

function SecondaryStat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-card">
      <div className="text-[12px] font-bold text-gray-400 uppercase tracking-[0.6px] mb-1.5">
        {label}
      </div>
      <div className="font-display font-extrabold text-[24px] text-dark tracking-[-0.4px]">
        {value}
      </div>
      <div className="text-[12.5px] text-gray-400 mt-1">{hint}</div>
    </div>
  )
}
