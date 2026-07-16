'use client'

import { useEffect, useState } from 'react'
import { Check, Filter, Search } from 'lucide-react'
import clsx from 'clsx'

export interface FilterState {
  type: string // 'all' | 'hostel' | 'room' | 'office' | 'business'
  district: string
  minPrice: number
  maxPrice: number
  amenities: string[]
  verifiedOnly: boolean
}

interface FilterSidebarProps {
  value: FilterState
  onApply: (next: FilterState) => void
}

const SPACE_TYPES: { val: string; label: string; count: number }[] = [
  { val: 'all', label: 'All Types', count: 48 },
  { val: 'hostel', label: 'Hostel', count: 14 },
  { val: 'room', label: 'Room / Flat', count: 22 },
  { val: 'office', label: 'Office', count: 8 },
  { val: 'business', label: 'Business', count: 4 },
]

const DISTRICTS = [
  'All',
  'Kathmandu',
  'Lalitpur',
  'Bhaktapur',
  'Pokhara',
  'Butwal',
  'Biratnagar',
  'Chitwan',
]

const AMENITY_LIST = [
  'WiFi',
  'Hot Water',
  'Parking',
  'AC',
  'Meals',
  'Laundry',
  'Security',
  'Generator',
]

const PRICE_MAX = 50000
const PRICE_STEP = 500

const fmtPrice = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)

export function FilterSidebar({ value, onApply }: FilterSidebarProps) {
  // local draft state — only pushed up via Apply button
  const [draft, setDraft] = useState<FilterState>(value)

  // Sync when URL-driven value changes externally (e.g. on navigation)
  useEffect(() => {
    setDraft(value)
  }, [value])

  const filterCount =
    (draft.type !== 'all' ? 1 : 0) +
    (draft.minPrice > 0 || draft.maxPrice < PRICE_MAX ? 1 : 0) +
    (draft.amenities.length > 0 ? 1 : 0) +
    (draft.verifiedOnly ? 1 : 0)

  const handleReset = () => {
    const reset: FilterState = {
      type: 'all',
      district: 'all',
      minPrice: 0,
      maxPrice: PRICE_MAX,
      amenities: [],
      verifiedOnly: false,
    }
    setDraft(reset)
    onApply(reset)
  }

  const toggleAmenity = (a: string) =>
    setDraft((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(a)
        ? prev.amenities.filter((x) => x !== a)
        : [...prev.amenities, a],
    }))

  const pct1 = (draft.minPrice / PRICE_MAX) * 100
  const pct2 = (draft.maxPrice / PRICE_MAX) * 100

  return (
    <aside className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden lg:sticky lg:top-[84px]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-[18px] pb-[14px] border-b border-gray-100">
        <div className="font-display text-[15px] font-extrabold text-gray-800 tracking-[-0.2px] flex items-center gap-2">
          <Filter size={15} strokeWidth={2.5} />
          Filters
          {filterCount > 0 && (
            <span className="bg-primary text-white text-[10px] font-extrabold w-[18px] h-[18px] rounded-full flex items-center justify-center">
              {filterCount}
            </span>
          )}
        </div>
        {filterCount > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="text-[12.5px] font-semibold text-gray-400 hover:text-primary transition-colors"
          >
            Reset all
          </button>
        )}
      </div>

      {/* Space type */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="font-display text-[12px] font-bold text-gray-600 uppercase tracking-[0.7px] mb-3">
          Space Type
        </div>
        <div className="flex flex-col gap-2">
          {SPACE_TYPES.map((t) => {
            const selected = draft.type === t.val
            return (
              <button
                key={t.val}
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, type: t.val }))}
                className="flex items-center gap-2.5 cursor-pointer py-0.5 text-left"
              >
                <span
                  className={clsx(
                    'w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors',
                    selected ? 'border-primary bg-primary' : 'border-gray-300 bg-white'
                  )}
                >
                  <span
                    className={clsx(
                      'w-1.5 h-1.5 rounded-full bg-white transition-opacity',
                      selected ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </span>
                <span
                  className={clsx(
                    'text-[14px] transition-colors',
                    selected ? 'text-dark font-semibold' : 'text-gray-600 font-normal'
                  )}
                >
                  {t.label}
                </span>
                <span className="ml-auto text-[11.5px] text-gray-400 bg-gray-100 rounded-full px-[7px] py-px">
                  {t.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Price range */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="font-display text-[12px] font-bold text-gray-600 uppercase tracking-[0.7px] mb-3">
          Price Range
        </div>
        <div className="flex justify-between font-display text-[13px] font-bold text-gray-800 mb-3.5">
          <span>
            NPR <span className="text-primary">{fmtPrice(draft.minPrice)}</span>
          </span>
          <span>
            NPR <span className="text-primary">{fmtPrice(draft.maxPrice)}</span>
          </span>
        </div>
        <div className="relative h-5 mx-1.5">
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 bg-gray-200 rounded-full">
            <div
              className="absolute top-0 h-full bg-primary rounded-full transition-all"
              style={{ left: `${pct1}%`, width: `${pct2 - pct1}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={PRICE_MAX}
            step={PRICE_STEP}
            value={draft.minPrice}
            onChange={(e) => {
              const v = parseInt(e.target.value)
              if (v < draft.maxPrice) setDraft((prev) => ({ ...prev, minPrice: v }))
            }}
            className="range-input absolute top-1/2 -translate-y-1/2 w-full h-1 appearance-none bg-transparent pointer-events-none outline-none"
            style={{ zIndex: draft.minPrice > 40000 ? 2 : 1 }}
          />
          <input
            type="range"
            min={0}
            max={PRICE_MAX}
            step={PRICE_STEP}
            value={draft.maxPrice}
            onChange={(e) => {
              const v = parseInt(e.target.value)
              if (v > draft.minPrice) setDraft((prev) => ({ ...prev, maxPrice: v }))
            }}
            className="range-input absolute top-1/2 -translate-y-1/2 w-full h-1 appearance-none bg-transparent pointer-events-none outline-none"
            style={{ zIndex: 2 }}
          />
        </div>
        <style jsx>{`
          .range-input::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: white;
            border: 2.5px solid var(--primary);
            box-shadow: 0 2px 6px rgba(29, 158, 117, 0.25);
            cursor: pointer;
            pointer-events: all;
            transition: transform 0.15s, box-shadow 0.15s;
          }
          .range-input::-webkit-slider-thumb:hover {
            transform: scale(1.2);
            box-shadow: 0 3px 10px rgba(29, 158, 117, 0.35);
          }
          .range-input::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: white;
            border: 2.5px solid var(--primary);
            box-shadow: 0 2px 6px rgba(29, 158, 117, 0.25);
            cursor: pointer;
            pointer-events: all;
          }
        `}</style>
      </div>

      {/* District */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="font-display text-[12px] font-bold text-gray-600 uppercase tracking-[0.7px] mb-3">
          Location
        </div>
        <select
          value={draft.district}
          onChange={(e) => setDraft((prev) => ({ ...prev, district: e.target.value }))}
          className="w-full h-10 px-3 pr-8 font-body text-[14px] text-gray-600 bg-white border-[1.5px] border-gray-200 rounded-sm outline-none cursor-pointer appearance-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(29,158,117,0.1)] transition-all"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%239ba3ad' d='M1 1l5 5 5-5'/%3E%3C/svg%3E\")",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
          }}
        >
          {DISTRICTS.map((d) => (
            <option key={d} value={d === 'All' ? 'all' : d}>
              {d === 'All' ? 'All Nepal' : d}
            </option>
          ))}
        </select>
      </div>

      {/* Amenities */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="font-display text-[12px] font-bold text-gray-600 uppercase tracking-[0.7px] mb-3">
          Amenities
        </div>
        <div className="grid grid-cols-2 gap-2">
          {AMENITY_LIST.map((a) => {
            const checked = draft.amenities.includes(a)
            return (
              <button
                key={a}
                type="button"
                onClick={() => toggleAmenity(a)}
                className="flex items-center gap-2 cursor-pointer py-0.5 text-left"
              >
                <span
                  className={clsx(
                    'w-4 h-4 rounded border-[1.5px] flex-shrink-0 flex items-center justify-center transition-colors',
                    checked ? 'border-primary bg-primary' : 'border-gray-300 bg-white'
                  )}
                >
                  {checked && <Check size={9} strokeWidth={3.5} className="stroke-white" />}
                </span>
                <span
                  className={clsx(
                    'text-[13.5px]',
                    checked ? 'text-dark-mid font-medium' : 'text-gray-600'
                  )}
                >
                  {a}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Parking toggle — dedicated shortcut into the amenities filter */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[14px] text-gray-600 font-medium">Parking available</div>
            <div className="text-[12px] text-gray-400 mt-0.5">Has dedicated parking space</div>
          </div>
          <button
            type="button"
            onClick={() =>
              setDraft((prev) => ({
                ...prev,
                amenities: prev.amenities.includes('Parking')
                  ? prev.amenities.filter((x) => x !== 'Parking')
                  : [...prev.amenities, 'Parking'],
              }))
            }
            className={clsx(
              'w-10 h-[22px] rounded-full border-none cursor-pointer p-0 relative transition-colors flex-shrink-0',
              draft.amenities.includes('Parking') ? 'bg-primary' : 'bg-gray-200'
            )}
            aria-label="Toggle parking available"
          >
            <span
              className={clsx(
                'absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform',
                draft.amenities.includes('Parking') ? 'translate-x-[18px]' : 'translate-x-0'
              )}
            />
          </button>
        </div>
      </div>

      {/* Verified toggle */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[14px] text-gray-600 font-medium">Verified listings only</div>
            <div className="text-[12px] text-gray-400 mt-0.5">Show only owner-verified spaces</div>
          </div>
          <button
            type="button"
            onClick={() =>
              setDraft((prev) => ({ ...prev, verifiedOnly: !prev.verifiedOnly }))
            }
            className={clsx(
              'w-10 h-[22px] rounded-full border-none cursor-pointer p-0 relative transition-colors flex-shrink-0',
              draft.verifiedOnly ? 'bg-primary' : 'bg-gray-200'
            )}
            aria-label="Toggle verified only"
          >
            <span
              className={clsx(
                'absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform',
                draft.verifiedOnly ? 'translate-x-[18px]' : 'translate-x-0'
              )}
            />
          </button>
        </div>
      </div>

      {/* Apply button */}
      <button
        type="button"
        onClick={() => onApply(draft)}
        className="mx-5 my-5 w-[calc(100%-40px)] h-[44px] bg-primary text-white border-none rounded-full text-[14px] font-bold cursor-pointer flex items-center justify-center gap-[7px] hover:bg-dark hover:-translate-y-px transition-all"
      >
        <Search size={14} strokeWidth={2.5} />
        Apply Filters
      </button>
    </aside>
  )
}
