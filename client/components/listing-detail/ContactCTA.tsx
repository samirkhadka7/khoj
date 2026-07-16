'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  Edit3,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  MessageCircle,
  MessageSquare,
  Pause,
  Phone,
  Play,
  ShieldCheck,
} from 'lucide-react'
import type { ContactRequest, Listing, User } from '@/types'

/**
 * Sidebar contact-action panel for the listing detail page.
 *
 * Renders one of six states depending on viewer + relationship to the listing:
 *   1. loading           — auth/request status still resolving
 *   2. own-listing       — viewer is the owner: show Edit + Pause/Resume
 *   3. accepted          — viewer's contact request was accepted: reveal contact info
 *   4. pending           — request awaiting owner response: countdown + lock CTA
 *   5. retryable         — request rejected/expired: allow re-sending
 *   6. logged-out        — show a "Login to Contact" CTA that redirects with `?redirect=`
 *   7. fresh             — logged-in but no request yet: show "Request Contact"
 *
 * The parent owns all the state — this component is purely presentational.
 */

export interface ContactInfoPayload {
  ownerName: string
  phone: string
  whatsappLink: string
}

interface ContactCTAProps {
  /** Loading flags from the page — true while we don't yet know the answer. */
  loading: boolean
  /** null = not logged in. */
  currentUser: User | null
  /** Whether the viewer is the listing's owner. */
  isOwnListing: boolean
  /** The viewer's most recent contact request for this listing, if any. */
  existingRequest: ContactRequest | null
  /** Owner contact (only present once `existingRequest.status === 'accepted'`). */
  contactInfo: ContactInfoPayload | null
  /** Listing — used for own-listing actions (id, isAvailable). */
  listing: Listing
  /** Click handlers wired by the parent. */
  onRequestContact: () => void
  onLoginRedirect: () => void
  onTogglePause: () => Promise<void>
  pausing: boolean
}

export function ContactCTA(props: ContactCTAProps) {
  const {
    loading,
    currentUser,
    isOwnListing,
    existingRequest,
    contactInfo,
    listing,
    onRequestContact,
    onLoginRedirect,
    onTogglePause,
    pausing,
  } = props

  if (loading) return <LoadingPanel />

  if (!currentUser) {
    return (
      <CTAPanel
        title="Login to contact this owner"
        body="Phone & WhatsApp are revealed only after the owner accepts your request."
        button={
          <button
            type="button"
            onClick={onLoginRedirect}
            className="w-full h-[46px] bg-primary text-white border-none rounded-sm font-display text-[15px] font-bold flex items-center justify-center gap-2 hover:bg-dark transition-colors"
          >
            <LogIn size={15} strokeWidth={2.5} />
            Login to Contact Owner
          </button>
        }
      />
    )
  }

  if (isOwnListing) {
    return (
      <div>
        <div className="bg-primary-subtle/60 rounded-sm p-3 mb-4">
          <div className="text-[12px] font-bold text-dark-mid mb-1 flex items-center gap-1.5">
            <ShieldCheck size={12} strokeWidth={2.5} />
            Your listing
          </div>
          <p className="text-[12px] text-dark-mid/80 leading-[1.5]">
            You own this listing. Use the actions below to edit details or pause requests.
          </p>
        </div>
        <Link
          href={`/dashboard/my-listings/${listing._id}/edit`}
          className="w-full h-[46px] bg-primary text-white border-none rounded-sm font-display text-[15px] font-bold flex items-center justify-center gap-2 hover:bg-dark transition-colors no-underline mb-2"
        >
          <Edit3 size={15} strokeWidth={2.5} />
          Edit Listing
        </Link>
        <button
          type="button"
          onClick={onTogglePause}
          disabled={pausing}
          className="w-full h-11 bg-white border-[1.5px] border-gray-200 rounded-sm font-semibold text-[14px] text-gray-800 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {pausing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : listing.isAvailable ? (
            <Pause size={14} strokeWidth={2.5} />
          ) : (
            <Play size={14} strokeWidth={2.5} />
          )}
          {listing.isAvailable ? 'Pause Listing' : 'Resume Listing'}
        </button>
        <p className="text-[11.5px] text-gray-400 text-center mt-2.5 leading-[1.5]">
          {listing.isAvailable
            ? 'Visible to tenants — accepting contact requests.'
            : 'Hidden from new searches — existing requests still active.'}
        </p>
      </div>
    )
  }

  if (existingRequest && existingRequest.status === 'accepted') {
    return <AcceptedPanel request={existingRequest} info={contactInfo} />
  }

  if (existingRequest && existingRequest.status === 'pending') {
    return <PendingPanel request={existingRequest} />
  }

  // Fresh state OR retryable (rejected / expired) — both render the CTA button
  const wasRejected =
    !!existingRequest &&
    (existingRequest.status === 'rejected' || existingRequest.status === 'expired')

  return (
    <div>
      {wasRejected && (
        <div className="bg-accent-subtle/70 border border-accent-light/30 rounded-sm p-3 mb-4">
          <div className="text-[12px] font-bold text-accent mb-1">
            {existingRequest.status === 'rejected'
              ? 'Previous request declined'
              : 'Previous request expired'}
          </div>
          <p className="text-[12px] text-[#8a5a10] leading-[1.5]">
            {existingRequest.status === 'rejected'
              ? 'You can send a new request — owners often reconsider.'
              : 'You can send a new request to try again.'}
          </p>
        </div>
      )}

      <div className="bg-primary-subtle/60 rounded-sm p-3 mb-4">
        <div className="text-[12px] font-bold text-dark-mid mb-1 flex items-center gap-1.5">
          <ShieldCheck size={12} strokeWidth={2.5} />
          Contact protected
        </div>
        <p className="text-[12px] text-dark-mid/80 leading-[1.5]">
          Phone &amp; WhatsApp are revealed only after the owner accepts your request.
        </p>
      </div>

      <button
        type="button"
        onClick={onRequestContact}
        className="w-full h-[46px] bg-primary text-white border-none rounded-sm font-display text-[15px] font-bold flex items-center justify-center gap-2 hover:bg-dark hover:-translate-y-px hover:shadow-[0_8px_28px_rgba(29,158,117,.22)] active:translate-y-0 transition-all"
      >
        <MessageCircle size={15} strokeWidth={2.5} />
        Request Contact
      </button>
      <p className="text-[11.5px] text-gray-400 text-center mt-2.5 leading-[1.5]">
        Free • No card required • Owner replies in ~2hrs
      </p>
    </div>
  )
}

function LoadingPanel() {
  return (
    <div className="bg-gray-50 rounded-sm p-6 flex flex-col items-center gap-3">
      <Loader2 size={20} className="animate-spin text-gray-400" />
      <p className="text-[12.5px] text-gray-500">Checking request status...</p>
    </div>
  )
}

function CTAPanel({
  title,
  body,
  button,
}: {
  title: string
  body: string
  button: React.ReactNode
}) {
  return (
    <div>
      <div className="bg-primary-subtle/60 rounded-sm p-3 mb-4">
        <div className="text-[12px] font-bold text-dark-mid mb-1 flex items-center gap-1.5">
          <Lock size={12} strokeWidth={2.5} />
          {title}
        </div>
        <p className="text-[12px] text-dark-mid/80 leading-[1.5]">{body}</p>
      </div>
      {button}
    </div>
  )
}

function AcceptedPanel({
  request,
  info,
}: {
  request: ContactRequest
  info: ContactInfoPayload | null
}) {
  return (
    <div>
      <div className="bg-primary-subtle/80 border border-primary/30 rounded-sm p-3 mb-4">
        <div className="text-[12px] font-bold text-dark-mid mb-1 flex items-center gap-1.5">
          <ShieldCheck size={12} strokeWidth={2.5} />
          Request accepted
        </div>
        <p className="text-[12px] text-dark-mid/80 leading-[1.5]">
          {info
            ? 'Contact info revealed below. Be respectful and verify in person before any payment.'
            : 'The owner accepted your request, but contact info is not available yet.'}
        </p>
      </div>
      {info ? (
        <>
          {/* Phone — click to call */}
          <a
            href={`tel:+977${info.phone.replace(/\D/g, '')}`}
            className="flex items-center gap-3 px-4 py-3 bg-white border-[1.5px] border-primary rounded-sm hover:bg-primary-subtle transition-colors no-underline mb-2"
          >
            <Phone size={16} className="text-primary" strokeWidth={2.5} />
            <div className="flex-1">
              <div className="text-[11px] font-bold text-primary uppercase tracking-[0.6px]">
                Phone
              </div>
              <div className="text-[14px] font-semibold text-gray-800">
                +977 {info.phone}
              </div>
            </div>
          </a>

          {/* WhatsApp deep link */}
          <a
            href={info.whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 bg-[#25D366]/10 border-[1.5px] border-[#25D366] rounded-sm hover:bg-[#25D366]/20 transition-colors no-underline mb-2"
          >
            <MessageSquare size={16} className="text-[#25D366]" strokeWidth={2.5} />
            <div className="flex-1">
              <div className="text-[11px] font-bold text-[#25D366] uppercase tracking-[0.6px]">
                WhatsApp
              </div>
              <div className="text-[14px] font-semibold text-gray-800">
                Open chat with greeting
              </div>
            </div>
          </a>

          {/* In-app chat */}
          <Link
            href={`/dashboard/messages/${request._id}`}
            className="flex items-center gap-3 px-4 py-3 bg-primary text-white rounded-sm hover:bg-dark transition-colors no-underline"
          >
            <MessageCircle size={16} strokeWidth={2.5} />
            <div className="flex-1">
              <div className="text-[11px] font-bold uppercase tracking-[0.6px] text-white/80">
                In-app
              </div>
              <div className="text-[14px] font-semibold">Open Chat</div>
            </div>
          </Link>

          <p className="text-[11px] text-gray-400 mt-3 leading-[1.5]">
            Owner: <span className="font-semibold text-gray-700">{info.ownerName}</span>
          </p>
        </>
      ) : (
        <div className="bg-white border-[1.5px] border-gray-200 rounded-sm p-3 text-[12.5px] text-gray-600">
          Contact details are missing. Ask the owner to add their phone number in profile.
        </div>
      )}
    </div>
  )
}

function PendingPanel({ request }: { request: ContactRequest }) {
  // Recompute remaining time once a minute — cheap timer, no per-second flicker
  const [now, setNow] = useState<number>(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const remainingMs = new Date(request.expiresAt).getTime() - now
  const expired = remainingMs <= 0

  const hours = Math.max(0, Math.floor(remainingMs / 3_600_000))
  const minutes = Math.max(0, Math.floor((remainingMs % 3_600_000) / 60_000))

  return (
    <div>
      <div className="bg-accent-subtle/70 border border-accent-light/30 rounded-sm p-3 mb-4">
        <div className="text-[12px] font-bold text-accent mb-1 flex items-center gap-1.5">
          <Eye size={12} strokeWidth={2.5} />
          Awaiting owner response
        </div>
        <p className="text-[12px] text-[#8a5a10] leading-[1.5]">
          {expired
            ? 'This request will expire shortly. Cron-job auto-marks it expired within an hour.'
            : `Owner has ${hours}h ${minutes}m remaining to respond. Requests auto-expire after 48 hours.`}
        </p>
      </div>
      <button
        type="button"
        disabled
        className="w-full h-[46px] bg-gray-200 text-gray-500 border-none rounded-sm font-display text-[15px] font-bold flex items-center justify-center gap-2 cursor-not-allowed"
      >
        <EyeOff size={15} strokeWidth={2.5} />
        Request Pending
      </button>
      <p className="text-[11.5px] text-gray-400 text-center mt-2.5 leading-[1.5]">
        Sent {new Date(request.createdAt).toLocaleString()}
      </p>
    </div>
  )
}
