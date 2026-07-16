'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/axios'
import { useDashboardUser } from '@/components/dashboard/DashboardContext'
import type { ApiResponse, ContactRequest, Listing, RequestStatus, User } from '@/types'

type StatusFilter = 'all' | RequestStatus

const STATUS_TABS: { val: StatusFilter; label: string }[] = [
  { val: 'all', label: 'All' },
  { val: 'pending', label: 'Pending' },
  { val: 'accepted', label: 'Accepted' },
  { val: 'rejected', label: 'Rejected' },
  { val: 'expired', label: 'Expired' },
]

const STATUS_BADGE: Record<
  RequestStatus,
  { color: string; label: string; Icon: typeof Clock }
> = {
  pending: { color: 'text-accent bg-accent-subtle', label: 'Pending', Icon: Clock },
  accepted: {
    color: 'text-dark-mid bg-primary-subtle',
    label: 'Accepted',
    Icon: CheckCircle2,
  },
  rejected: { color: 'text-gray-600 bg-gray-100', label: 'Declined', Icon: XCircle },
  expired: { color: 'text-gray-600 bg-gray-100', label: 'Expired', Icon: XCircle },
}

export default function ContactRequestsPage() {
  const { user } = useDashboardUser()
  const isOwner = user.role === 'owner' || user.role === 'admin'

  const [requests, setRequests] = useState<ContactRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [revealOpen, setRevealOpen] = useState<ContactRequest | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const url = isOwner ? '/api/contact-request/received' : '/api/contact-request/sent'
      const { data } = await api.get<ApiResponse<ContactRequest[]>>(url)
      if (data.success && data.data) setRequests(data.data)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner])

  const visible =
    filter === 'all' ? requests : requests.filter((r) => r.status === filter)

  const handleAccept = async (id: string) => {
    setActingId(id)
    try {
      await api.patch(`/api/contact-request/${id}/accept`)
      toast.success('Request accepted')
      await load()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Could not accept')
    } finally {
      setActingId(null)
    }
  }

  const handleReject = async (id: string) => {
    setActingId(id)
    try {
      await api.patch(`/api/contact-request/${id}/reject`)
      toast.success('Request declined')
      await load()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Could not decline')
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1100px]">
      <div className="mb-6">
        <h1 className="font-display font-extrabold text-[26px] text-gray-800 tracking-[-0.4px]">
          {isOwner ? 'Received Requests' : 'My Requests'}
        </h1>
        <p className="text-[14px] text-gray-600 mt-1">
          {isOwner
            ? 'Tenants who want to contact you about your listings.'
            : 'Track all your contact requests and view contact info once accepted.'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {STATUS_TABS.map((t) => {
          const count =
            t.val === 'all' ? requests.length : requests.filter((r) => r.status === t.val).length
          const active = filter === t.val
          return (
            <button
              key={t.val}
              type="button"
              onClick={() => setFilter(t.val)}
              className={`relative px-4 py-2.5 text-[14px] font-medium transition-colors whitespace-nowrap ${
                active ? 'text-dark' : 'text-gray-400 hover:text-gray-800'
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-[12px] text-gray-400">({count})</span>
              {active && <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-primary" />}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={28} className="animate-spin text-gray-400" />
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-lg p-10 text-center">
          <div className="w-14 h-14 mx-auto mb-3 bg-gray-50 rounded-full flex items-center justify-center">
            <Mail size={22} className="text-gray-400" />
          </div>
          <h3 className="font-display font-bold text-[16px] text-gray-800 mb-1">No requests</h3>
          <p className="text-[13px] text-gray-600">
            {isOwner
              ? 'When a tenant requests contact, you’ll see them here.'
              : 'Browse listings and send a contact request when you find a space.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((req) => (
            <RequestRow
              key={req._id}
              request={req}
              isOwner={isOwner}
              acting={actingId === req._id}
              onAccept={() => handleAccept(req._id)}
              onReject={() => handleReject(req._id)}
              onReveal={() => setRevealOpen(req)}
            />
          ))}
        </div>
      )}

      {/* Reveal modal */}
      {revealOpen && (
        <ContactRevealModal
          request={revealOpen}
          onClose={() => setRevealOpen(null)}
        />
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function RequestRow({
  request,
  isOwner,
  acting,
  onAccept,
  onReject,
  onReveal,
}: {
  request: ContactRequest
  isOwner: boolean
  acting: boolean
  onAccept: () => void
  onReject: () => void
  onReveal: () => void
}) {
  const listing = typeof request.listingId === 'object' ? (request.listingId as Listing) : null
  const otherUser =
    typeof (isOwner ? request.tenantId : request.ownerId) === 'object'
      ? ((isOwner ? request.tenantId : request.ownerId) as User)
      : null
  const badge = STATUS_BADGE[request.status]
  const Icon = badge.Icon

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-5 flex gap-5 items-start flex-wrap">
      {/* Listing thumbnail */}
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <div className="w-16 h-16 rounded-md bg-primary-subtle flex items-center justify-center text-2xl flex-shrink-0">
          🏠
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${badge.color}`}
            >
              <Icon size={10} strokeWidth={3} />
              {badge.label}
            </span>
            <span className="text-[12px] text-gray-400">
              {new Date(request.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>

          <Link
            href={listing ? `/listings/${listing._id}` : '#'}
            className="font-display font-bold text-[15.5px] text-gray-800 hover:text-primary transition-colors block truncate"
          >
            {listing?.title || 'Listing'}
          </Link>

          {otherUser && (
            <div className="text-[13px] text-gray-600 mt-1.5">
              {isOwner ? 'From' : 'Owner'}:{' '}
              <span className="font-medium text-gray-800">{otherUser.name}</span>
            </div>
          )}

          <p className="text-[13px] text-gray-600 mt-2 leading-[1.5] line-clamp-2">
            {request.message}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-start sm:justify-end">
        {isOwner && request.status === 'pending' && (
          <>
            <button
              type="button"
              onClick={onReject}
              disabled={acting}
              className="h-9 px-4 bg-white border-[1.5px] border-gray-200 rounded-sm text-[13px] font-semibold text-gray-800 hover:border-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={onAccept}
              disabled={acting}
              className="h-9 px-4 bg-primary text-white border-none rounded-sm text-[13px] font-bold hover:bg-dark transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {acting ? <Loader2 size={12} className="animate-spin" /> : null}
              Accept
            </button>
          </>
        )}

        {!isOwner && request.status === 'accepted' && (
          <button
            type="button"
            onClick={onReveal}
            className="h-9 px-4 bg-primary text-white border-none rounded-sm text-[13px] font-bold hover:bg-dark transition-colors flex items-center gap-1.5"
          >
            <Phone size={12} strokeWidth={2.5} />
            View Contact Details
          </button>
        )}

        {/* Owner-side counterpart on accepted requests: jump straight into the
            chat thread. Without this, owners had no inline path to the chat
            from the page where they just accepted the request. */}
        {isOwner && request.status === 'accepted' && (
          <Link
            href={`/dashboard/messages/${request._id}`}
            className="h-9 px-4 bg-primary text-white border-none rounded-sm text-[13px] font-bold hover:bg-dark transition-colors flex items-center gap-1.5 no-underline"
          >
            <MessageSquare size={12} strokeWidth={2.5} />
            Open Chat
          </Link>
        )}

        {!isOwner && request.status === 'rejected' && listing && (
          <Link
            href={`/listings?type=${listing.type}`}
            className="h-9 px-4 bg-white border-[1.5px] border-gray-200 rounded-sm text-[13px] font-semibold text-gray-800 hover:border-primary hover:text-primary transition-colors"
          >
            Find Similar
          </Link>
        )}

        {!isOwner && request.status === 'expired' && listing && (
          <Link
            href={`/listings/${listing._id}`}
            className="h-9 px-4 bg-white border-[1.5px] border-gray-200 rounded-sm text-[13px] font-semibold text-gray-800 hover:border-primary hover:text-primary transition-colors"
          >
            Send New Request
          </Link>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

interface ContactInfo {
  ownerName: string
  phone: string
  whatsappLink: string
}

function ContactRevealModal({
  request,
  onClose,
}: {
  request: ContactRequest
  onClose: () => void
}) {
  const [info, setInfo] = useState<ContactInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await api.get<ApiResponse<ContactInfo>>(
          `/api/contact-request/${request._id}/contact-info`
        )
        if (cancelled) return
        if (data.success && data.data) setInfo(data.data)
        else setError(data.message || 'Could not load contact info')
      } catch (err: unknown) {
        if (cancelled) return
        const e = err as { response?: { data?: { message?: string } } }
        setError(e.response?.data?.message || 'Could not load contact info')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [request._id])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[420px] bg-white rounded-lg overflow-hidden"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="h-1"
          style={{
            background:
              'linear-gradient(90deg, var(--dark) 0%, var(--primary) 50%, #5dce9e 100%)',
          }}
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3.5 top-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="px-7 py-7 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-subtle flex items-center justify-center">
            <ShieldCheck size={32} className="text-primary" strokeWidth={2} />
          </div>

          <h2 className="font-display font-extrabold text-[20px] text-gray-800 mb-1.5">
            Contact unlocked
          </h2>
          <p className="text-[13px] text-gray-600 mb-6 leading-[1.6]">
            The owner has accepted your request. You can now reach out directly.
          </p>

          {loading ? (
            <Loader2 size={28} className="animate-spin text-gray-400 mx-auto my-6" />
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-sm p-3 text-[13px] text-red-600">
              {error}
            </div>
          ) : info ? (
            <div className="text-left space-y-2.5">
              <div className="px-4 py-3 bg-offWhite border border-gray-100 rounded-sm">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.6px] mb-0.5">
                  Owner
                </div>
                <div className="text-[15px] font-semibold text-gray-800">{info.ownerName}</div>
              </div>

              <a
                href={`tel:+977${info.phone}`}
                className="flex items-center gap-3 px-4 py-3 bg-white border-[1.5px] border-primary rounded-sm hover:bg-primary-subtle transition-colors no-underline"
              >
                <Phone size={18} className="text-primary" strokeWidth={2.5} />
                <div className="flex-1">
                  <div className="text-[11px] font-bold text-primary uppercase tracking-[0.6px]">
                    Call
                  </div>
                  <div className="text-[15px] font-semibold text-gray-800">+977 {info.phone}</div>
                </div>
              </a>

              <a
                href={info.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 bg-[#25D366]/10 border-[1.5px] border-[#25D366] rounded-sm hover:bg-[#25D366]/20 transition-colors no-underline"
              >
                <MessageSquare size={18} className="text-[#25D366]" strokeWidth={2.5} />
                <div className="flex-1">
                  <div className="text-[11px] font-bold text-[#25D366] uppercase tracking-[0.6px]">
                    WhatsApp
                  </div>
                  <div className="text-[14px] font-semibold text-gray-800">
                    Open chat with greeting
                  </div>
                </div>
              </a>
            </div>
          ) : null}

          <p className="text-[11px] text-gray-400 mt-5 leading-[1.5]">
            Be respectful. Verify in person before any payment.
            <br />
            Never wire money without seeing the property first.
          </p>
        </div>
      </div>
    </div>
  )
}
