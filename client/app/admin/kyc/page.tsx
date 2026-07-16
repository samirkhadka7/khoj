'use client'

import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  IdCard,
  Loader2,
  ShieldCheck,
  ShieldX,
  X,
  XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import api from '@/lib/axios'
import type { ApiResponse, Kyc, KycStatus, User } from '@/types'

type StatusFilter = 'all' | KycStatus

const STATUS_TABS: { val: StatusFilter; label: string }[] = [
  { val: 'pending', label: 'Pending' },
  { val: 'approved', label: 'Approved' },
  { val: 'rejected', label: 'Rejected' },
  { val: 'all', label: 'All' },
]

const STATUS_BADGE: Record<KycStatus, { color: string; Icon: typeof CheckCircle2 }> = {
  pending: { color: 'text-accent bg-accent-subtle', Icon: Loader2 },
  approved: { color: 'text-dark-mid bg-primary-subtle', Icon: CheckCircle2 },
  rejected: { color: 'text-red-700 bg-red-50', Icon: XCircle },
}

export default function AdminKycPage() {
  const [items, setItems] = useState<Kyc[]>([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [filter, setFilter] = useState<StatusFilter>('pending')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = async (statusVal: StatusFilter, pageVal: number) => {
    setLoading(true)
    try {
      const q = new URLSearchParams()
      if (statusVal !== 'all') q.set('status', statusVal)
      q.set('page', String(pageVal))
      q.set('limit', '20')
      const { data } = await api.get<ApiResponse<Kyc[]>>(`/api/admin/kyc?${q}`)
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
      toast.error(e.response?.data?.message || 'Failed to load KYC applications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(filter, page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page])

  const onTab = (next: StatusFilter) => {
    setFilter(next)
    setPage(1)
  }

  const handleApprove = async (id: string, name: string) => {
    if (!confirm(`Approve ${name}? Their account will be promoted to owner.`)) return
    setActingId(id)
    try {
      await api.patch(`/api/admin/kyc/${id}/approve`)
      toast.success(`${name} approved — promoted to owner`)
      await load(filter, page)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Could not approve')
    } finally {
      setActingId(null)
    }
  }

  const submitReject = async () => {
    if (!rejectingId) return
    if (rejectReason.trim().length < 5) {
      toast.error('Reason must be at least 5 characters')
      return
    }
    setActingId(rejectingId)
    try {
      await api.patch(`/api/admin/kyc/${rejectingId}/reject`, { reason: rejectReason.trim() })
      toast.success('Application rejected — applicant notified')
      setRejectingId(null)
      setRejectReason('')
      await load(filter, page)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Could not reject')
    } finally {
      setActingId(null)
    }
  }

  const viewing = items.find((k) => k._id === viewingId) || null

  return (
    <div className="px-8 py-8 max-w-[1100px]">
      <div className="mb-6">
        <h1 className="font-display font-extrabold text-[28px] text-gray-800 tracking-[-0.5px]">
          KYC Applications
          {!loading && (
            <span className="text-gray-400 font-medium ml-2">({pagination.total})</span>
          )}
        </h1>
        <p className="text-[14px] text-gray-600 mt-1">
          Review citizenship documents. Approving promotes the user to <strong>owner</strong>.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {STATUS_TABS.map((t) => {
          const active = filter === t.val
          return (
            <button
              key={t.val}
              type="button"
              onClick={() => onTab(t.val)}
              className={clsx(
                'relative px-4 py-2.5 text-[14px] font-medium transition-colors whitespace-nowrap',
                active ? 'text-dark' : 'text-gray-400 hover:text-gray-800'
              )}
            >
              {t.label}
              {active && <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-primary" />}
            </button>
          )
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-gray-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-lg p-12 text-center">
          <div className="w-14 h-14 mx-auto mb-3 bg-primary-subtle rounded-full flex items-center justify-center">
            <IdCard size={22} className="text-primary" />
          </div>
          <h3 className="font-display font-bold text-[16px] text-gray-800 mb-1">
            Nothing to review
          </h3>
          <p className="text-[13.5px] text-gray-600">
            {filter === 'pending'
              ? 'All applications have been processed.'
              : 'No applications match this filter.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-lg overflow-hidden shadow-card">
          {/* Header */}
          <div className="hidden md:grid grid-cols-[2fr_1.2fr_1fr_1fr_220px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-600 uppercase tracking-[0.6px]">
            <div>Applicant</div>
            <div>Phone</div>
            <div>Submitted</div>
            <div>Status</div>
            <div className="text-right">Actions</div>
          </div>

          {items.map((k) => {
            const u = typeof k.userId === 'object' ? (k.userId as User) : null
            const badge = STATUS_BADGE[k.status]
            return (
              <div
                key={k._id}
                className="md:grid md:grid-cols-[2fr_1.2fr_1fr_1fr_220px] gap-4 px-5 py-4 border-b border-gray-100 last:border-b-0 items-center"
              >
                {/* Applicant */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary-subtle flex items-center justify-center text-primary font-display font-bold text-[13px] flex-shrink-0 overflow-hidden">
                    {u?.profilePhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.profilePhoto} alt={u.name} className="w-full h-full object-cover" />
                    ) : (
                      k.legalName[0]?.toUpperCase() || 'U'
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-gray-800 truncate">
                      {k.legalName}
                    </div>
                    {u?.email && (
                      <div className="text-[12px] text-gray-400 truncate">{u.email}</div>
                    )}
                  </div>
                </div>

                <div className="mt-2 md:mt-0 text-[13px] text-gray-600">+977 {k.phone}</div>

                <div className="mt-1 md:mt-0 text-[12.5px] text-gray-500">
                  {new Date(k.submittedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>

                <div className="mt-1 md:mt-0">
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.5px] px-2 py-0.5 rounded-full',
                      badge.color
                    )}
                  >
                    <badge.Icon size={10} strokeWidth={3} />
                    {k.status}
                  </span>
                  {k.status === 'rejected' && k.rejectionReason && (
                    <div
                      className="text-[11px] text-gray-500 mt-1 truncate max-w-[160px]"
                      title={k.rejectionReason}
                    >
                      {k.rejectionReason}
                    </div>
                  )}
                </div>

                <div className="mt-3 md:mt-0 flex justify-end items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewingId(k._id)}
                    aria-label="View documents"
                    className="h-9 px-3 bg-white border-[1.5px] border-gray-200 rounded-sm text-[12.5px] font-semibold text-gray-800 hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <Eye size={12} />
                    View
                  </button>
                  {k.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingId(k._id)
                          setRejectReason('')
                        }}
                        disabled={actingId === k._id}
                        className="h-9 px-3 bg-white border-[1.5px] border-gray-200 rounded-sm text-[12.5px] font-bold text-gray-700 hover:border-red-400 hover:text-red-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        <ShieldX size={12} strokeWidth={2.5} />
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(k._id, k.legalName)}
                        disabled={actingId === k._id}
                        className="h-9 px-3 bg-primary text-white border-none rounded-sm text-[12.5px] font-bold hover:bg-dark transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        {actingId === k._id ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <ShieldCheck size={12} strokeWidth={2.5} />
                        )}
                        Approve
                      </button>
                    </>
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

      {/* Document viewer modal */}
      {viewing && <DocViewerModal kyc={viewing} onClose={() => setViewingId(null)} />}

      {/* Reject reason modal */}
      {rejectingId && (
        <RejectModal
          reason={rejectReason}
          onChange={setRejectReason}
          onClose={() => {
            setRejectingId(null)
            setRejectReason('')
          }}
          onSubmit={submitReject}
          loading={actingId === rejectingId}
        />
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function DocViewerModal({ kyc, onClose }: { kyc: Kyc; onClose: () => void }) {
  const docs: { label: string; url: string }[] = [
    { label: 'Citizenship Front', url: kyc.citizenshipFront },
    { label: 'Citizenship Back', url: kyc.citizenshipBack },
    { label: 'Selfie with ID', url: kyc.selfieWithId },
  ]

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[820px] bg-white rounded-lg overflow-hidden max-h-[90vh] flex flex-col"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,.3)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <div className="font-display font-extrabold text-[16px] text-gray-800">
              {kyc.legalName}
            </div>
            <div className="text-[12px] text-gray-400">
              +977 {kyc.phone} · {kyc.address.area}, {kyc.address.district}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {docs.map((d) => (
            <DocPreview key={d.label} label={d.label} url={d.url} />
          ))}
        </div>
      </div>
    </div>
  )
}

function DocPreview({ label, url }: { label: string; url: string }) {
  const isPdf = url.toLowerCase().endsWith('.pdf') || url.includes('/raw/')
  return (
    <div className="border border-gray-100 rounded-md overflow-hidden bg-gray-50">
      <div className="aspect-[3/4] bg-gray-100 flex items-center justify-center">
        {isPdf ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2 text-gray-600 hover:text-primary"
          >
            <IdCard size={48} />
            <span className="text-[12px] font-semibold">Open PDF</span>
          </a>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <a href={url} target="_blank" rel="noopener noreferrer">
            <img src={url} alt={label} className="w-full h-full object-cover" />
          </a>
        )}
      </div>
      <div className="px-3 py-2 text-[12px] font-semibold text-gray-700 bg-white border-t border-gray-100">
        {label}
      </div>
    </div>
  )
}

function RejectModal({
  reason,
  onChange,
  onClose,
  onSubmit,
  loading,
}: {
  reason: string
  onChange: (v: string) => void
  onClose: () => void
  onSubmit: () => void
  loading: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] bg-white rounded-lg overflow-hidden"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,.3)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="font-display font-extrabold text-[16px] text-gray-800">
            Reject KYC application
          </div>
          <div className="text-[12.5px] text-gray-600 mt-0.5">
            The applicant will see this reason and can resubmit.
          </div>
        </div>
        <div className="p-5">
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. Citizenship back photo is blurry, please re-upload a clearer scan"
            maxLength={500}
            className="w-full px-3.5 py-3 font-body text-[14px] text-gray-800 bg-white border-[1.5px] border-gray-200 rounded-sm outline-none resize-none placeholder:text-gray-400 focus:border-primary focus:shadow-[0_0_0_3px_rgba(29,158,117,.1)] transition-all"
          />
          <div className="text-[11.5px] text-gray-400 text-right mt-1">{reason.length}/500</div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 bg-white border-[1.5px] border-gray-200 rounded-sm font-semibold text-[13.5px] text-gray-800 hover:border-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading || reason.trim().length < 5}
            className="flex-1 h-10 bg-red-500 text-white border-none rounded-sm font-bold text-[13.5px] hover:bg-red-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <ShieldX size={13} strokeWidth={2.5} />
            )}
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}
