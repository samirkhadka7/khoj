'use client'

import { useRouter } from 'next/navigation'
import { useState, FormEvent } from 'react'

/** Maps the design's space-type <option> labels to our ListingType slugs. */
const TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Room/Flat', value: 'room' },
  { label: 'Hostel', value: 'hostel' },
  { label: 'Office Rent', value: 'office' },
  { label: 'Business Space', value: 'business' },
]

export function Hero() {
  const router = useRouter()
  const [location, setLocation] = useState('')
  const [type, setType] = useState('room')

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (location) params.set('district', location)
    if (type) params.set('type', type)
    router.push(`/listings?${params.toString()}`)
  }

  return (
    <section className="relative min-h-[640px] flex items-center justify-center overflow-hidden">
      {/* Background image + brand gradient overlay */}
      <div className="absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="w-full h-full object-cover"
          alt="A sun-drenched modern apartment interior in Kathmandu with wooden accents and floor-to-ceiling windows overlooking the Himalayan foothills."
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDpH9fp3uSTKAVLy9oPgLLaf0R0Qhx6VjxD7gpvn5_LkjwyVtwDMnORt-sUIdRO1Pkgfx89ve84qRkz6swPEIO9p5m3P7_X4lIrf-qbsT6zKjyyfJQjF5ymRtA4MeRVzXDW3_qI45F6BDJB8nSww4xheIWl-K_EpnB9LwoysPhqeNQZFUHmaOvpzrH4aqI6fX2IqcTchSignza8doUGIyDB-dTP6fwF1wFQamN5pR3q1yShmKAbtVv4Izb1HozYWargZmXuaVXfdntn"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand/80 to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-container-max px-5 md:px-12 text-white">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight tracking-tight">
            Find Your Perfect Space in Nepal
          </h1>
          <p className="text-lg mb-10 opacity-90">
            Nepal&apos;s Most Trusted Room-Finding Platform. From cozy hostels to premium
            business spaces, discover verified properties with BaasKhoj.
          </p>

          {/* Search interface */}
          <form
            onSubmit={handleSearch}
            className="bg-surface p-2 rounded-xl shadow-xl flex flex-col md:flex-row gap-2 w-full"
          >
            <div className="flex-1 flex items-center px-4 bg-surface-container-low rounded-lg">
              <span className="material-symbols-outlined text-outline" aria-hidden="true">search</span>
              <input
                className="w-full bg-transparent border-none focus:ring-0 py-4 text-base text-on-surface"
                placeholder="Location, Area or City"
                aria-label="Search by location, area or city"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="flex-1 flex items-center px-4 bg-surface-container-low rounded-lg">
              <span className="material-symbols-outlined text-outline" aria-hidden="true">category</span>
              <select
                className="w-full bg-transparent border-none focus:ring-0 py-4 text-base text-on-surface"
                aria-label="Space type"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="bg-brand text-white px-10 py-4 rounded-lg text-sm font-bold hover:bg-brand-container transition-all"
            >
              Search
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
