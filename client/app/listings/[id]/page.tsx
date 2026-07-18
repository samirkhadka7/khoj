'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  Flag,
  GraduationCap,
  Heart,
  LayoutGrid,
  Loader2,
  MapPin,
  Share2,
  ShieldCheck,
  Star,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api, { getAccessToken, silentRefresh } from '@/lib/axios'
import { Navbar } from '@/components/landing/Navbar'
import { ContactRequestModal } from '@/components/listing-detail/ContactRequestModal'
import {
  ContactCTA,
  type ContactInfoPayload,
} from '@/components/listing-detail/ContactCTA'
import {
  AmenitiesGrid,
  KeyStats,
  ReviewsSection,
  SpaceDetailsTable,
  TrustCard,
} from '@/components/listing-detail/sections'
import type { ApiResponse, ContactRequest, Listing, User } from '@/types'

const TYPE_LABEL = {
  hostel: 'Hostel',
  room: 'Room / Flat',
  office: 'Office',
  business: 'Business',
} as const

const FALLBACK_GRADIENTS = {
  hostel: 'linear-gradient(135deg, #c8eddf 0%, #93d9bc 100%)',
  room: 'linear-gradient(135deg, #bdd6fb 0%, #89b8f7 100%)',
  office: 'linear-gradient(135deg, #faddaa 0%, #f5c46a 100%)',
  business: 'linear-gradient(135deg, #f5c8b8 0%, #d99a86 100%)',
} as const

const FALLBACK_EMOJI = { hostel: '🏠', room: '🛏️', office: '💼', business: '🏪' } as const

export default function ListingDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const listingId = params.id

  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageIdx, setImageIdx] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [favorited, setFavorited] = useState(false)

  // Current viewer + their relationship to this listing.
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [existingRequest, setExistingRequest] = useState<ContactRequest | null>(null)
  const [contactInfo, setContactInfo] = useState<ContactInfoPayload | null>(null)
  const [ctaLoading, setCtaLoading] = useState(true)
  const [pausing, setPausing] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await api.get<ApiResponse<Listing>>(`/api/listings/${listingId}`)
        if (cancelled) return
        if (data.success && data.data) setListing(data.data)
      } catch (err: unknown) {
        if (cancelled) return
        const e = err as { response?: { status?: number; data?: { message?: string } } }
        if (e.response?.status !== 404) {
          toast.error(e.response?.data?.message || 'Failed to load listing')
        }
        setListing(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [listingId])

  /**
   * Resolve the viewer's identity + their existing request state for this listing.
   * useCallback so the modal's onClose can re-trigger it after a fresh request.
   */
  const resolveViewerContext = useCallback(async () => {
    setCtaLoading(true)
    // Public page: a reloaded but logged-in visitor starts with no in-memory
    // token, so try to restore the session from the refresh cookie first.
    if (!getAccessToken()) await silentRefresh()
    const token = getAccessToken()
    if (!token) {
      setCurrentUser(null)
      setExistingRequest(null)
      setContactInfo(null)
      setCtaLoading(false)
      return
    }

    try {
      const [meRes, sentRes] = await Promise.all([
        api.get<ApiResponse<User>>('/api/auth/me'),
        api.get<ApiResponse<ContactRequest[]>>(
          `/api/contact-request/sent?listingId=${listingId}&limit=10`
        ),
      ])

      if (meRes.data.success && meRes.data.data) setCurrentUser(meRes.data.data)

      const sentList = sentRes.data.data ?? []
      const forThisListing = sentList.filter((r) => {
        const lid = typeof r.listingId === 'object' ? r.listingId._id : r.listingId
        return lid === listingId
      })
      forThisListing.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      const latest = forThisListing[0] ?? null
      setExistingRequest(latest)

      if (latest && latest.status === 'accepted') {
        const ciRes = await api.get<ApiResponse<ContactInfoPayload>>(
          `/api/contact-request/${latest._id}/contact-info`
        )
        if (ciRes.data.success && ciRes.data.data) setContactInfo(ciRes.data.data)
      } else {
        setContactInfo(null)
      }
    } catch {
      // 401 → effectively logged out; treat silently.
    } finally {
      setCtaLoading(false)
    }
  }, [listingId])

  useEffect(() => {
    void resolveViewerContext()
  }, [resolveViewerContext])

  const handleContactClick = () => {
    if (!currentUser) {
      router.push(`/auth/login?redirect=/listings/${listingId}`)
      return
    }
    setContactOpen(true)
  }

  const handleLoginRedirect = () => {
    router.push(`/auth/login?redirect=/listings/${listingId}`)
  }

  const handleTogglePause = useCallback(async () => {
    if (!listing) return
    setPausing(true)
    try {
      const next = !listing.isAvailable
      const { data } = await api.put<ApiResponse<Listing>>(`/api/listings/${listing._id}`, {
        isAvailable: next,
      })
      if (data.success && data.data) {
        setListing(data.data)
        toast.success(next ? 'Listing resumed' : 'Listing paused — hidden from search')
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      toast.error(e.response?.data?.message || e.message || 'Could not update listing')
    } finally {
      setPausing(false)
    }
  }, [listing])

  const handleWishlist = async () => {
    if (typeof window === 'undefined') return
    const token = getAccessToken()
    if (!token) {
      router.push(`/auth/login?redirect=/listings/${listingId}`)
      return
    }
    try {
      const { data } = await api.post<
        ApiResponse<{ action: 'added' | 'removed'; count: number }>
      >(`/api/listings/${listingId}/wishlist`)
      if (data.success && data.data) {
        setFavorited(data.data.action === 'added')
        toast.success(
          data.data.action === 'added' ? 'Saved to wishlist' : 'Removed from wishlist'
        )
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Could not update wishlist')
    }
  }

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard')
    }
  }

  const handleReport = async () => {
    const reason = prompt('Why are you reporting this listing?')
    if (!reason || reason.length < 5) return
    try {
      await api.post(`/api/listings/${listingId}/report`, { reason })
      toast.success('Report submitted — admin will review')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Could not submit report')
    }
  }

  /* -------------------------------------------------------------------------- */

  if (loading) {
    return (
      <main className="min-h-screen bg-offWhite">
        <Navbar />
        <div className="pt-[120px] flex items-center justify-center">
          <Loader2 size={32} className="text-gray-400 animate-spin" />
        </div>
      </main>
    )
  }

  if (!listing) {
    return (
      <main className="min-h-screen bg-offWhite">
        <Navbar />
        <div className="pt-[120px] max-w-container mx-auto px-6 text-center">
          <h1 className="font-display font-extrabold text-[24px] text-gray-800 mb-2">
            Listing not found
          </h1>
          <p className="text-[14px] text-gray-600 mb-6">
            This listing may have been removed or is no longer available.
          </p>
          <button
            type="button"
            onClick={() => router.push('/listings')}
            className="inline-flex items-center gap-2 h-10 px-5 bg-primary text-white rounded-sm font-semibold text-[14px] hover:bg-dark transition-colors"
          >
            Browse all listings
          </button>
        </div>
      </main>
    )
  }

  const owner = typeof listing.ownerId === 'object' ? (listing.ownerId as User) : null
  const images = listing.images?.length ? listing.images : []
  const ownerIdStr =
    typeof listing.ownerId === 'object' ? listing.ownerId._id : listing.ownerId
  const isOwnListing = !!currentUser && ownerIdStr === currentUser._id

  // Hostel-only: nearby college, surfaced as a highlight chip
  const tf = listing.typeFields as unknown as Record<string, unknown>
  const nearbyCollege =
    typeof tf?.nearbyCollege === 'string' && tf.nearbyCollege.trim()
      ? tf.nearbyCollege.trim()
      : ''

  const openLightbox = (i: number) => {
    setImageIdx(i)
    setLightboxOpen(true)
  }

  return (
    <main className="min-h-screen bg-offWhite">
      <Navbar />

      <div className="max-w-container mx-auto px-6 lg:px-8 pt-[88px] pb-16">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 mb-6 text-[13px] text-gray-400 flex-wrap">
          <Link href="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <ChevronRight size={14} />
          <Link href="/listings" className="hover:text-primary transition-colors">
            Listings
          </Link>
          <ChevronRight size={14} />
          <Link
            href={`/listings?district=${encodeURIComponent(listing.location.district)}`}
            className="hover:text-primary transition-colors"
          >
            {listing.location.district}
          </Link>
          <ChevronRight size={14} />
          <span className="text-dark font-semibold truncate max-w-[200px]">{listing.title}</span>
        </nav>

        {/* Gallery grid */}
        <Gallery
          images={images}
          type={listing.type}
          onOpen={openLightbox}
        />

        {/* Main two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12 mt-10">
          {/* LEFT — details */}
          <div className="lg:col-span-2 space-y-10">
            {/* Title + verified + location */}
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-[28px] sm:text-[32px] font-bold text-dark tracking-tight leading-tight">
                  {listing.title}
                </h1>
                {listing.isVerified && (
                  <span className="flex items-center gap-1 bg-secondary-container px-3 py-1 rounded-full text-dark-mid text-[12px] font-bold border border-primary/10">
                    <ShieldCheck size={13} strokeWidth={2.5} />
                    Verified
                  </span>
                )}
                {!listing.isAvailable && (
                  <span className="bg-red-50 text-red-600 rounded-full text-[12px] font-bold px-3 py-1">
                    Occupied
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-[14px] text-gray-500 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <MapPin size={16} className="text-primary" />
                  {listing.location.address}, {listing.location.area}, {listing.location.district}
                </span>
                <span className="flex items-center gap-1.5 text-gray-400">
                  <Eye size={14} />
                  {listing.viewCount} views
                </span>
              </div>

              {/* Hostel: "Near <college>" highlight chip */}
              {listing.type === 'hostel' && nearbyCollege && (
                <div className="mt-3 inline-flex items-center gap-1.5 bg-primary-subtle text-dark-mid px-3 py-1.5 rounded-full text-[13px] font-semibold">
                  <GraduationCap size={14} strokeWidth={2.2} />
                  Near {nearbyCollege}
                </div>
              )}
            </div>

            {/* Key stats */}
            <KeyStats listing={listing} />

            {/* About */}
            <section>
              <h2 className="text-[22px] font-bold text-dark tracking-tight mb-4">
                About this space
              </h2>
              <p className="text-[15px] text-gray-600 leading-relaxed whitespace-pre-line">
                {listing.description}
              </p>
            </section>

            {/* Amenities */}
            {listing.amenities.length > 0 && (
              <section>
                <h2 className="text-[22px] font-bold text-dark tracking-tight mb-6">Amenities</h2>
                <AmenitiesGrid amenities={listing.amenities} />
              </section>
            )}

            {/* Space details */}
            <section>
              <h2 className="text-[22px] font-bold text-dark tracking-tight mb-6">Space Details</h2>
              <SpaceDetailsTable listing={listing} />
            </section>

            {/* Location / map */}
            <section>
              <h2 className="text-[22px] font-bold text-dark tracking-tight mb-6">Location</h2>
              <div className="h-[280px] rounded-lg bg-primary-subtle/40 border border-gray-200/60 flex flex-col items-center justify-center text-gray-400">
                <MapPin size={28} className="text-primary mb-2" />
                <p className="text-[14px] font-semibold text-gray-600">
                  {listing.location.area}, {listing.location.district}
                </p>
                <p className="text-[12px] mt-0.5">Interactive map coming soon</p>
              </div>
            </section>

            {/* Reviews */}
            <ReviewsSection listing={listing} />
          </div>

          {/* RIGHT — sticky sidebar */}
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-28 space-y-6">
              {/* Price + contact card */}
              <div className="bg-white p-6 sm:p-7 border border-gray-200/70 rounded-2xl shadow-lg">
                <div className="flex justify-between items-baseline mb-5">
                  <div>
                    <p className="text-[12px] text-gray-400 font-medium">Starting from</p>
                    <h3 className="text-[26px] font-bold text-dark tracking-tight">
                      NPR {listing.price.toLocaleString('en-IN')}
                      <span className="text-[14px] font-normal text-gray-400"> /month</span>
                    </h3>
                  </div>
                  {listing.negotiable && (
                    <span className="text-[11px] font-bold text-accent uppercase tracking-wider bg-accent-subtle px-2.5 py-1 rounded">
                      Negotiable
                    </span>
                  )}
                </div>

                {/* Multi-state contact action (logged-out / own / accepted / pending / fresh) */}
                <ContactCTA
                  loading={ctaLoading}
                  currentUser={currentUser}
                  isOwnListing={isOwnListing}
                  existingRequest={existingRequest}
                  contactInfo={contactInfo}
                  listing={listing}
                  onRequestContact={handleContactClick}
                  onLoginRedirect={handleLoginRedirect}
                  onTogglePause={handleTogglePause}
                  pausing={pausing}
                />

                {/* Save / Share */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button
                    type="button"
                    onClick={handleWishlist}
                    className="flex items-center justify-center gap-2 border border-gray-200 py-3 rounded-lg text-[13.5px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Heart
                      size={16}
                      className={favorited ? 'fill-red-500 stroke-red-500' : 'stroke-current'}
                    />
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex items-center justify-center gap-2 border border-gray-200 py-3 rounded-lg text-[13.5px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Share2 size={16} />
                    Share
                  </button>
                </div>

                {/* Owner */}
                {owner && (
                  <div className="pt-6 mt-6 border-t border-gray-100">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 rounded-full bg-primary-subtle flex items-center justify-center text-primary font-bold text-[16px] flex-shrink-0 overflow-hidden">
                        {owner.profilePhoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={owner.profilePhoto}
                            alt={owner.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          owner.name?.[0]?.toUpperCase() || 'O'
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[14px] font-bold text-gray-800 flex items-center gap-1">
                          {owner.name}
                          {owner.isVerified && (
                            <ShieldCheck size={14} className="text-primary" strokeWidth={2.5} />
                          )}
                        </h4>
                        <p className="text-[12px] text-gray-400">
                          Member since{' '}
                          {new Date(owner.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    {listing.totalReviews > 0 && (
                      <div className="bg-primary-subtle/50 px-3 py-2 rounded-lg flex justify-between items-center">
                        <span className="text-[13px] text-gray-500">Rating</span>
                        <span className="text-primary font-bold text-[13px] flex items-center gap-1">
                          <Star size={12} className="fill-accent-light stroke-accent-light" />
                          {listing.averageRating.toFixed(1)} ({listing.totalReviews})
                        </span>
                      </div>
                    )}

                    {/* Report — low-priority link */}
                    <button
                      type="button"
                      onClick={handleReport}
                      className="mt-4 w-full flex items-center justify-center gap-1.5 text-[12px] text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Flag size={12} />
                      Report this listing
                    </button>
                  </div>
                )}
              </div>

              {/* BaasKhoj Trust */}
              <TrustCard />
            </div>
          </aside>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && images.length > 0 && (
        <div
          className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X size={22} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[imageIdx]}
            alt={listing.title}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setImageIdx((i) => (i - 1 + images.length) % images.length)
                }}
                className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                aria-label="Previous"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setImageIdx((i) => (i + 1) % images.length)
                }}
                className="absolute right-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                aria-label="Next"
              >
                <ChevronRight size={24} />
              </button>
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-white/10 text-white text-[13px] px-3 py-1 rounded-full">
                {imageIdx + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      )}

      <ContactRequestModal
        open={contactOpen}
        onClose={() => {
          setContactOpen(false)
          void resolveViewerContext()
        }}
        listing={listing}
      />
    </main>
  )
}

/* -------------------------------------------------------------------------- */
/*  Gallery — Stitch 4-col grid: big cover + 2×2 thumbnails                    */
/* -------------------------------------------------------------------------- */

function Gallery({
  images,
  type,
  onOpen,
}: {
  images: string[]
  type: keyof typeof FALLBACK_GRADIENTS
  onOpen: (i: number) => void
}) {
  // No images → branded gradient placeholder
  if (images.length === 0) {
    return (
      <div
        className="w-full h-[300px] md:h-[460px] rounded-xl flex items-center justify-center"
        style={{ background: FALLBACK_GRADIENTS[type] }}
      >
        <span className="text-[120px]">{FALLBACK_EMOJI[type]}</span>
      </div>
    )
  }

  const cover = images[0]
  const rest = images.slice(1, 5) // up to 4 thumbnails
  const extra = images.length - 5

  return (
    <section className="grid grid-cols-1 md:grid-cols-4 gap-3 h-[300px] md:h-[460px] rounded-xl overflow-hidden">
      {/* Cover */}
      <button
        type="button"
        onClick={() => onOpen(0)}
        className="md:col-span-2 relative group h-full overflow-hidden"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover}
          alt=""
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </button>

      {/* Right two columns of stacked thumbnails */}
      {rest.length > 0 && (
        <div className="hidden md:grid grid-cols-2 col-span-2 gap-3">
          {rest.map((src, i) => {
            const isLast = i === rest.length - 1 && extra > 0
            return (
              <button
                key={src}
                type="button"
                onClick={() => onOpen(i + 1)}
                className="relative group overflow-hidden rounded-lg h-full"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                {isLast && (
                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white font-bold text-[16px] gap-2">
                    <LayoutGrid size={18} />+{extra} more
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
