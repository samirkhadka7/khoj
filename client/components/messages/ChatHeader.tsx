'use client'

import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import clsx from 'clsx'
import type { Listing, User } from '@/types'

/**
 * Header row of a chat thread — back button + recipient avatar/name +
 * connection/typing status + listing context.
 */
export function ChatHeader({
  other,
  listing,
  connected,
  otherTyping,
}: {
  other: User | null
  listing: Listing | null
  connected: boolean
  otherTyping: boolean
}) {
  return (
    <header className="bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-3 flex-shrink-0">
      <Link
        href="/dashboard/messages"
        aria-label="Back to messages"
        className="w-9 h-9 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
      >
        <ArrowLeft size={18} />
      </Link>

      <div className="w-10 h-10 rounded-full overflow-hidden bg-primary-subtle flex items-center justify-center text-primary font-display font-bold text-[14px] flex-shrink-0">
        {other?.profilePhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={other.profilePhoto} alt={other.name} className="w-full h-full object-cover" />
        ) : (
          other?.name?.[0]?.toUpperCase() || '?'
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-display font-bold text-[14.5px] text-gray-800 truncate">
            {other?.name ?? 'User'}
          </span>
          {other?.isVerified && (
            <ShieldCheck size={12} className="text-primary flex-shrink-0" strokeWidth={2.5} />
          )}
        </div>
        <div className="text-[11.5px] text-gray-400 truncate flex items-center gap-1.5">
          <span
            className={clsx(
              'inline-block w-1.5 h-1.5 rounded-full',
              connected ? 'bg-primary' : 'bg-gray-300'
            )}
          />
          {connected ? (otherTyping ? 'typing…' : 'Online') : 'Connecting…'}
          {listing && <span className="ml-1">· {listing.title}</span>}
        </div>
      </div>

      {listing && (
        <Link
          href={`/listings/${listing._id}`}
          className="hidden sm:flex items-center gap-2 h-9 px-3 bg-white border border-gray-200 rounded-sm text-[12.5px] font-semibold text-gray-700 hover:border-primary hover:text-primary transition-colors flex-shrink-0"
        >
          View Listing
        </Link>
      )}
    </header>
  )
}
