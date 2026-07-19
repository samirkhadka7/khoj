'use client'

import Link from 'next/link'
import { ArrowRight, Check, Heart, MapPin, Star } from 'lucide-react'
import clsx from 'clsx'
import type { Listing, ListingType } from '@/types'

const TYPE_BADGE_COLOR: Record<ListingType, string> = {
  hostel: 'bg-[#085041]',
  room: 'bg-[#0C447C]',
  office: 'bg-[#633806]',
  business: 'bg-[#712B13]',
}

const TYPE_LABEL: Record<ListingType, string> = {
  hostel: 'Hostel',
  room: 'Room',
  office: 'Office',
  business: 'Business',
}

/**
 * Fallback gradients for listings that have no images yet.
 * Matches the landing page's FeaturedListings demo cards.
 */
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

interface ListingCardProps {
  listing: Listing
  isFavorite?: boolean
  onToggleFavorite?: (listingId: string) => void
}

export function ListingCardSkeleton() {
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-card border-[1.5px] border-gray-100 flex flex-col animate-pulse">
      {/* Image Skeleton */}
      <div className="w-full aspect-[16/9] bg-gray-200" />
      
      {/* Body Skeleton */}
      <div className="px-[18px] pt-3.5 pb-3 flex-1 flex flex-col space-y-3">
        {/* Title */}
        <div className="h-5 bg-gray-200 rounded-md w-3/4" />
        
        {/* Location */}
        <div className="h-3 bg-gray-200 rounded-md w-1/2" />
        
        {/* Amenities */}
        <div className="flex gap-1.5 mt-2">
          <div className="h-5 bg-gray-200 rounded-full w-16" />
          <div className="h-5 bg-gray-200 rounded-full w-20" />
          <div className="h-5 bg-gray-200 rounded-full w-14" />
        </div>
        
        {/* Ratings spacing */}
        <div className="flex items-center gap-1.5 mt-3">
          <div className="h-3 bg-gray-200 rounded-md w-12" />
          <div className="h-3 bg-gray-200 rounded-md w-16" />
        </div>
        
        {/* Price */}
        <div className="flex items-baseline gap-1 mt-2 mb-1">
          <div className="h-6 bg-gray-200 rounded-md w-28" />
          <div className="h-3 bg-gray-200 rounded-md w-12" />
        </div>
      </div>
    </div>
  )
}

export function ListingCard({ listing, isFavorite, onToggleFavorite }: ListingCardProps) {
  const cover = listing.images?.[0]

  return (
    <Link
      href={`/listings/${listing._id}`}
      className="group bg-white rounded-lg overflow-hidden shadow-card border-[1.5px] border-gray-100 cursor-pointer flex flex-col transition-all duration-200 hover:-translate-y-[5px] hover:shadow-lg hover:border-gray-200"
    >
      {/* Image / placeholder */}
      <div className="relative w-full aspect-[16/9] bg-gray-100 overflow-hidden flex-shrink-0">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={listing.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.04]"
            style={{ background: FALLBACK_GRADIENTS[listing.type] }}
          >
            <span
              className="text-[60px]"
              style={{ filter: 'drop-shadow(0 6px 16px rgba(0,0,0,.10))' }}
            >
              {FALLBACK_EMOJI[listing.type]}
            </span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3.5 left-3.5 flex gap-1.5 items-center">
          <span
            className={clsx(
              'text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-[0.5px] text-white',
              TYPE_BADGE_COLOR[listing.type]
            )}
          >
            {TYPE_LABEL[listing.type]}
          </span>
          {listing.isVerified && (
            <span className="bg-white/95 text-dark-mid rounded-full text-[11px] font-bold px-2.5 py-1 flex items-center gap-0.5 shadow-[0_1px_4px_rgba(0,0,0,.10)]">
              <Check size={10} strokeWidth={3} />
              Verified
            </span>
          )}
        </div>

        {/* Heart */}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleFavorite(listing._id)
            }}
            aria-label={isFavorite ? 'Remove from wishlist' : 'Add to wishlist'}
            className="absolute top-3 right-3 w-[34px] h-[34px] bg-white/90 border-none rounded-full flex items-center justify-center cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,.12)] z-[2] hover:scale-[1.18] hover:bg-white transition-all"
          >
            <Heart
              size={16}
              className={isFavorite ? 'fill-red-500 stroke-red-500' : 'stroke-gray-600'}
            />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-[18px] pt-3.5 pb-3 flex-1 flex flex-col">
        <div className="font-display font-bold text-[15.5px] text-gray-800 truncate">
          {listing.title}
        </div>
        <div className="flex items-center gap-1 text-[13px] text-gray-500 mt-1.5">
          <MapPin size={12} strokeWidth={2.5} />
          {listing.location.area}, {listing.location.district}
        </div>

        {listing.amenities.length > 0 && (
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {listing.amenities.slice(0, 3).map((a) => (
              <span
                key={a}
                className="text-[11.5px] text-gray-600 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-0.5"
              >
                {a}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-800 mt-3">
          <Star size={13} className="fill-accent-light stroke-accent-light" />
          <span>{listing.averageRating > 0 ? listing.averageRating.toFixed(1) : 'New'}</span>
          {listing.totalReviews > 0 && (
            <span className="text-gray-500 font-normal">({listing.totalReviews} reviews)</span>
          )}
        </div>

        <div className="flex items-baseline gap-1 mt-2 mb-3.5">
          <div className="font-display font-extrabold text-[20px] text-primary">
            NPR {listing.price.toLocaleString('en-IN')}
          </div>
          <div className="text-[12.5px] font-normal text-gray-500">/month</div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-[18px] pb-4 mt-auto">
        <span className="font-body text-[14px] font-semibold text-white bg-primary border-none rounded-sm px-4 py-2.5 cursor-pointer w-full flex items-center justify-center gap-1.5 group-hover:bg-dark group-hover:-translate-y-px transition-all">
          View Details
          <ArrowRight size={14} strokeWidth={2.5} />
        </span>
      </div>
    </Link>
  )
}
