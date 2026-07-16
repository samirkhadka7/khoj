'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, Heart, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/axios'
import { ListingCard } from '@/components/listings/ListingCard'
import type { ApiResponse, Listing } from '@/types'

/**
 * Hits the dedicated GET /api/listings/wishlist endpoint. The old client-side
 * filter relied on `wishlistedBy` being publicly readable — that field is now
 * stripped from public listing responses to prevent leaking which users like
 * which listings.
 */
export default function WishlistPage() {
  const [items, setItems] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get<ApiResponse<Listing[]>>('/api/listings/wishlist?limit=50')
      if (data.success && data.data) {
        setItems(data.data)
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Failed to load wishlist')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleToggle = async (listingId: string) => {
    try {
      await api.post(`/api/listings/${listingId}/wishlist`)
      // Optimistically remove from this list (since user just unwishlisted)
      setItems((prev) => prev.filter((l) => l._id !== listingId))
      toast.success('Removed from wishlist')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Could not update')
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1100px]">
      <div className="mb-6">
        <h1 className="font-display font-extrabold text-[26px] text-gray-800 tracking-[-0.4px]">
          Saved Spaces
          {items.length > 0 && (
            <span className="text-gray-400 font-medium ml-2">({items.length})</span>
          )}
        </h1>
        <p className="text-[14px] text-gray-600 mt-1">
          Listings you&apos;ve hearted. Click any card to view, or remove from wishlist.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={28} className="animate-spin text-gray-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-lg p-10 text-center">
          <div className="w-14 h-14 mx-auto mb-3 bg-gray-50 rounded-full flex items-center justify-center">
            <Heart size={24} className="text-gray-400" />
          </div>
          <h3 className="font-display font-bold text-[16px] text-gray-800 mb-1.5">
            No saved spaces yet
          </h3>
          <p className="text-[13.5px] text-gray-600 max-w-[320px] mx-auto mb-4 leading-[1.6]">
            Tap the heart on any listing to save it for later.
          </p>
          <Link
            href="/listings"
            className="inline-flex items-center gap-1.5 h-9 px-4 bg-primary text-white rounded-sm font-semibold text-[13px] hover:bg-dark transition-colors"
          >
            Browse Listings
            <ArrowRight size={13} strokeWidth={2.5} />
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 grid-cols-1 gap-5">
          {items.map((l) => (
            <ListingCard
              key={l._id}
              listing={l}
              isFavorite
              onToggleFavorite={handleToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}
