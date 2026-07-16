'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Map,
  MapPin,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import toast from 'react-hot-toast'

import api from '@/lib/axios'
import { Navbar } from '@/components/landing/Navbar'
import { FilterSidebar, type FilterState } from '@/components/listings/FilterSidebar'
import { ListingCard, ListingCardSkeleton } from '@/components/listings/ListingCard'
import type { ApiResponse, Listing } from '@/types'

const PAGE_LIMIT = 12

const DEFAULT_FILTERS: FilterState = {
  type: 'all',
  district: 'all',
  minPrice: 0,
  maxPrice: 50000,
  amenities: [],
  verifiedOnly: false,
}

function paramsToFilters(params: URLSearchParams): FilterState {
  return {
    type: params.get('type') || 'all',
    district: params.get('district') || 'all',
    minPrice: Number(params.get('minPrice') || 0),
    maxPrice: Number(params.get('maxPrice') || 50000),
    amenities: params.get('amenities') ? params.get('amenities')!.split(',') : [],
    verifiedOnly: params.get('verifiedOnly') === 'true',
  }
}

function filtersToQuery(f: FilterState, page: number): string {
  const q = new URLSearchParams()
  if (f.type !== 'all') q.set('type', f.type)
  if (f.district && f.district !== 'all') q.set('district', f.district)
  if (f.minPrice > 0) q.set('minPrice', String(f.minPrice))
  if (f.maxPrice < 50000) q.set('maxPrice', String(f.maxPrice))
  if (f.amenities.length > 0) q.set('amenities', f.amenities.join(','))
  if (f.verifiedOnly) q.set('verifiedOnly', 'true')
  if (page > 1) q.set('page', String(page))
  return q.toString()
}

interface ListingsPageContentProps {
  basePath: string
  showNavbar?: boolean
}

export function ListingsPageContent({ basePath, showNavbar = false }: ListingsPageContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const filters = useMemo(() => paramsToFilters(searchParams), [searchParams])
  const page = Number(searchParams.get('page') || 1)
  const sort = searchParams.get('sort') || 'newest'

  const [listings, setListings] = useState<Listing[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    pages: 1,
  })
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')

  // Fetch when filters or page change
  useEffect(() => {
    let cancelled = false

    const fetchListings = async () => {
      setLoading(true)
      try {
        const query = new URLSearchParams()
        if (filters.type !== 'all') query.set('type', filters.type)
        if (filters.district && filters.district !== 'all') {
          query.set('district', filters.district)
        }
        if (filters.minPrice > 0) query.set('minPrice', String(filters.minPrice))
        if (filters.maxPrice < 50000) query.set('maxPrice', String(filters.maxPrice))
        if (filters.amenities.length > 0) query.set('amenities', filters.amenities.join(','))
        if (filters.verifiedOnly) query.set('verifiedOnly', 'true')
        query.set('page', String(page))
        query.set('limit', String(PAGE_LIMIT))

        const { data } = await api.get<ApiResponse<Listing[]>>(`/api/listings?${query}`)
        if (cancelled) return

        if (data.success && data.data) {
          setListings(data.data)
          if (data.pagination) setPagination(data.pagination)
        }
      } catch (err: unknown) {
        if (cancelled) return
        const e = err as { response?: { data?: { message?: string } }; message?: string }
        toast.error(e.response?.data?.message || e.message || 'Failed to load listings')
        setListings([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchListings()
    return () => {
      cancelled = true
    }
  }, [filters, page])

  const applyFilters = useCallback(
    (next: FilterState) => {
      router.push(`${basePath}?${filtersToQuery(next, 1)}`)
      setDrawerOpen(false)
    },
    [router, basePath]
  )

  const goToPage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > pagination.pages) return
    const q = filtersToQuery(filters, nextPage)
    router.push(`${basePath}?${q}`)
  }

  const setSort = (next: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', next)
    router.push(`${basePath}?${params.toString()}`)
  }

  const headerPadding = showNavbar ? 'pt-[88px]' : 'pt-6'

  return (
    <main className="min-h-screen bg-offWhite">
      {showNavbar && <Navbar />}

      {/* Hero strip with results title */}
      <section className={`bg-white border-b border-gray-100 ${headerPadding} pb-6 px-6`}>
        <div className="max-w-container mx-auto">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <div className="inline-block text-[11px] font-bold uppercase tracking-[1px] text-dark-mid bg-secondary-container px-2.5 py-1 rounded-full mb-2">
                Search Results
              </div>
              <h1 className="text-[28px] font-extrabold text-dark tracking-tight">
                {filters.type === 'all'
                  ? 'All Spaces'
                  : `${filters.type.charAt(0).toUpperCase()}${filters.type.slice(1)}s`}{' '}
                {filters.district === 'all' ? 'across Nepal' : `in ${filters.district}`}
              </h1>
              <p className="text-[14px] text-gray-500 mt-1">
                {loading
                  ? 'Loading...'
                  : `${pagination.total} ${pagination.total === 1 ? 'space' : 'spaces'} found`}
              </p>
            </div>

            {/* Sort + view toggle + mobile filter */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="lg:hidden flex items-center gap-2 px-4 h-10 bg-white border-[1.5px] border-gray-200 rounded-full text-[14px] font-semibold text-gray-800 hover:border-primary transition-colors"
              >
                <SlidersHorizontal size={14} strokeWidth={2.5} />
                Filters
              </button>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="h-10 pl-4 pr-9 font-body text-[14px] text-gray-800 bg-white border-[1.5px] border-gray-200 rounded-full outline-none cursor-pointer appearance-none focus:border-primary transition-colors"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%239ba3ad' d='M1 1l5 5 5-5'/%3E%3C/svg%3E\")",
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 14px center',
                }}
              >
                <option value="newest">Sort: Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>

              {/* Grid / Map view toggle pill */}
              <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-full">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                  className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] font-semibold transition-colors ${
                    viewMode === 'grid' ? 'bg-white text-dark shadow-sm' : 'text-gray-500'
                  }`}
                >
                  <LayoutGrid size={14} />
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  aria-label="Map view"
                  className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-[13px] font-semibold transition-colors ${
                    viewMode === 'map' ? 'bg-white text-dark shadow-sm' : 'text-gray-500'
                  }`}
                >
                  <Map size={14} />
                  <span className="hidden sm:inline">Map</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="max-w-container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-[280px_1fr] grid-cols-1 gap-6">
          {/* Sidebar — desktop */}
          <div className="hidden lg:block">
            <FilterSidebar value={filters} onApply={applyFilters} />
          </div>

          {/* Mobile drawer */}
          {drawerOpen && (
            <div
              className="lg:hidden fixed inset-0 z-50 bg-black/40"
              onClick={() => setDrawerOpen(false)}
            >
              <div
                className="absolute right-0 top-0 bottom-0 w-[320px] max-w-[90vw] bg-white overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <FilterSidebar value={filters} onApply={applyFilters} />
              </div>
            </div>
          )}

          {/* Results grid */}
          <div>
            {loading ? (
              <div className="grid lg:grid-cols-2 xl:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ListingCardSkeleton key={i} />
                ))}
              </div>
            ) : listings.length === 0 ? (
              <EmptyState onReset={() => applyFilters(DEFAULT_FILTERS)} />
            ) : viewMode === 'map' ? (
              <MapPlaceholder count={listings.length} />
            ) : (
              <>
                <div className="grid lg:grid-cols-2 xl:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-5">
                  {listings.map((l) => (
                    <ListingCard key={l._id} listing={l} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    <button
                      type="button"
                      onClick={() => goToPage(page - 1)}
                      disabled={page <= 1}
                      className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-sm text-gray-600 hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:text-gray-600"
                    >
                      <ChevronLeft size={18} />
                    </button>

                    {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => goToPage(p)}
                        className={
                          p === page
                            ? 'w-10 h-10 flex items-center justify-center bg-primary text-white border border-primary rounded-sm font-semibold'
                            : 'w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-sm text-gray-600 hover:border-primary hover:text-primary transition-colors'
                        }
                      >
                        {p}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => goToPage(page + 1)}
                      disabled={page >= pagination.pages}
                      className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-sm text-gray-600 hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:text-gray-600"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

function MapPlaceholder({ count }: { count: number }) {
  return (
    <div className="bg-primary-subtle/40 border border-gray-200/60 rounded-2xl h-[560px] flex flex-col items-center justify-center text-center px-6">
      <div className="w-16 h-16 mb-4 bg-white rounded-2xl shadow-sm flex items-center justify-center">
        <MapPin size={28} className="text-primary" />
      </div>
      <h3 className="text-[18px] font-bold text-dark mb-1.5">Map view</h3>
      <p className="text-[14px] text-gray-500 max-w-[360px] leading-relaxed">
        Interactive Leaflet map with {count} pinned {count === 1 ? 'listing' : 'listings'} is coming
        soon. For now, switch back to grid view to browse spaces.
      </p>
    </div>
  )
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg p-12 text-center">
      <div className="w-16 h-16 mx-auto mb-4 bg-primary-subtle rounded-full flex items-center justify-center">
        <Search size={28} className="text-primary" />
      </div>
      <h3 className="font-display font-bold text-[18px] text-gray-800 mb-1.5">No spaces found</h3>
      <p className="text-[14px] text-gray-600 max-w-[320px] mx-auto mb-6 leading-[1.6]">
        Try widening your filters or browsing a different district.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-2 h-10 px-5 bg-primary text-white border-none rounded-sm font-semibold text-[14px] hover:bg-dark transition-colors"
      >
        Reset Filters
      </button>
    </div>
  )
}
