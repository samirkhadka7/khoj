'use client'

import Link from 'next/link'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import type { ContactRequest, Listing, User } from '@/types'

/**
 * A single row in the /dashboard/messages list.
 * Resolves the "other party" relative to the viewer so the avatar + name
 * always show whoever the viewer is talking TO, not themselves.
 */
export function ConversationRow({
  request,
  viewerId,
}: {
  request: ContactRequest
  viewerId: string
}) {
  const tenant = typeof request.tenantId === 'object' ? (request.tenantId as User) : null
  const owner = typeof request.ownerId === 'object' ? (request.ownerId as User) : null
  const tenantId = typeof request.tenantId === 'object' ? request.tenantId._id : request.tenantId
  const isViewerTenant = tenantId === viewerId
  const other = isViewerTenant ? owner : tenant

  const listing = typeof request.listingId === 'object' ? (request.listingId as Listing) : null

  return (
    <Link
      href={`/dashboard/messages/${request._id}`}
      className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors no-underline"
    >
      <div className="w-12 h-12 rounded-full overflow-hidden bg-primary-subtle flex items-center justify-center text-primary font-display font-bold text-[16px] flex-shrink-0">
        {other?.profilePhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={other.profilePhoto}
            alt={other.name}
            className="w-full h-full object-cover"
          />
        ) : (
          other?.name?.[0]?.toUpperCase() || '?'
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-display font-bold text-[14.5px] text-gray-800 truncate">
            {other?.name ?? 'User'}
          </span>
          {other?.isVerified && (
            <ShieldCheck size={12} className="text-primary flex-shrink-0" strokeWidth={2.5} />
          )}
          <span className="text-[10.5px] font-bold uppercase tracking-[0.5px] text-dark-mid bg-primary-subtle px-1.5 py-0.5 rounded-full ml-1">
            {isViewerTenant ? 'Owner' : 'Tenant'}
          </span>
        </div>
        {listing && (
          <div className="text-[12.5px] text-gray-400 truncate mt-0.5">
            About: {listing.title}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {listing?.images?.[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="w-12 h-12 rounded-md object-cover hidden sm:block"
          />
        )}
        <ArrowRight size={16} className="text-gray-300" />
      </div>
    </Link>
  )
}
