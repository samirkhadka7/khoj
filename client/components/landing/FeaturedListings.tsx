import Link from 'next/link'

interface Feature {
  icon: string // Material Symbols name
  label: string
}

interface FeaturedListing {
  name: string
  location: string
  price: string
  rating: string
  reviews: number
  image: string
  features: Feature[]
}

/**
 * Demo data — wired to GET /api/listings?isFeatured=true later. Kept inline so
 * the landing page renders without the backend running.
 */
const listings: FeaturedListing[] = [
  {
    name: 'Modern Studio Apartment',
    location: 'Lazimpat, Kathmandu',
    price: 'NPR 25,000 /mo',
    rating: '4.8',
    reviews: 24,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD6-u08jlrj2_BayAfcDEK7eWP5u2ddphAkbsfA8Owbg4l-JrrV0rZhB92MOrR3qQf-Yjp1fJ3oJSS6xo29OOBPTxjuCVwTX_vWQGnIn1GSZwzf1f_M7k8KUzqBya5v8_qlQyHoI_iadIex17DtbuhRgx_stxhLDP40pzVRgHQROe5zJgIbOuGbf3xeEdhUYHrjAq95FBlFMbzk8GDtklptEGG-EGEgQ-861IVoeYetHrcncyyhiZZ-lOJ-JQWZBPQHBOdYfw7LdD46',
    features: [
      { icon: 'bed', label: '1 Bed' },
      { icon: 'bathtub', label: '1 Bath' },
      { icon: 'square_foot', label: '450 sqft' },
    ],
  },
  {
    name: 'Premium Office Suite',
    location: 'Baneshwor, Kathmandu',
    price: 'NPR 45,000 /mo',
    rating: '4.9',
    reviews: 12,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC0fyKng6EX81GHwem22gI1gr1yQtgutDFpapjqeOptnEfVJfZEr6UI_9UsE0-QTahTgtlFYAfNGoN0_QHz8mbCXm5jMAMDU26XcucczExoSOkDRDLP7nDFVyygZ1ixwBzFmMZLVLoQua3dQaa8RZbckitfJKUu9v3U252uhljGBsYcQyFV_F8YcFl2MsijYlzX2br7izQpmPbOEk67S7y9TmmfWscLb3f7GFbISygClu0yCaO6Jc9yVUXJAXTHJNOSEIqdKk8KpR0J',
    features: [
      { icon: 'wifi', label: 'High Speed' },
      { icon: 'ac_unit', label: 'Full A/C' },
      { icon: 'meeting_room', label: '3 Rooms' },
    ],
  },
  {
    name: 'Elite Student Hostel',
    location: 'Patan, Lalitpur',
    price: 'NPR 8,500 /mo',
    rating: '4.7',
    reviews: 56,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAkSujVl67ckKLKGp6pbbYpdrPdqkFaIuGuG-ax02bw33b_nhOZEvYXtUEgihCL-5-Ra2mTwCrGHjzs_lwFwIk2zHqOK0HoJmkqoOADlZSQomUAM157BnG207PfpUcf6h3gdJ7B126Jr9pABi0b1oIboE4BzkhE5U20JHHg-t-1qQnVyOnHuCuGuuR-jtjb8q9QIWtmPoQ-KbpSKxSXcvOU_4jx4mnWfMfGfVd1NiCkba1ZlgmVcm9BkxopbqFLJLWpbbK3RMtFIunb',
    features: [
      { icon: 'flatware', label: 'Kitchen' },
      { icon: 'cleaning_services', label: 'Cleaning' },
      { icon: 'security', label: '24/7 Sec' },
    ],
  },
]

export function FeaturedListings() {
  return (
    <section id="listings" className="py-20 bg-surface-container-low">
      <div className="px-5 md:px-12 max-w-container-max mx-auto">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-semibold text-brand">Featured Listings</h2>
            <p className="text-base text-on-surface-variant">Premium spaces verified by our team</p>
          </div>
          <div className="hidden sm:flex gap-2">
            <button
              type="button"
              aria-label="Previous"
              className="w-12 h-12 rounded-full border border-outline flex items-center justify-center hover:bg-white transition-colors"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button
              type="button"
              aria-label="Next"
              className="w-12 h-12 rounded-full border border-outline flex items-center justify-center hover:bg-white transition-colors"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {listings.map((l) => (
            <Link
              key={l.name}
              href="/listings"
              className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant hover:shadow-xl transition-all group"
            >
              <div className="relative h-64">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  alt={l.name}
                  src={l.image}
                />
                <div className="absolute top-4 right-4 bg-tertiary text-on-tertiary px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
                  <span className="material-symbols-outlined text-sm fill-icon">verified</span>
                  <span className="text-xs font-semibold uppercase tracking-wider">Verified</span>
                </div>
                <div className="absolute bottom-4 left-4 bg-brand/90 text-white px-3 py-1 rounded-md text-sm font-medium">
                  {l.price}
                </div>
              </div>

              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-semibold">{l.name}</h3>
                  <div className="flex items-center gap-1 text-tertiary">
                    <span className="material-symbols-outlined text-lg fill-icon">star</span>
                    <span className="text-sm font-medium">
                      {l.rating} ({l.reviews})
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-on-surface-variant text-base mb-4">
                  <span className="material-symbols-outlined text-lg">location_on</span>
                  {l.location}
                </div>
                <div className="flex items-center gap-4 py-4 border-t border-outline-variant">
                  {l.features.map((f) => (
                    <div
                      key={f.label}
                      className="flex items-center gap-1 text-on-surface-variant text-xs font-semibold"
                    >
                      <span className="material-symbols-outlined text-lg">{f.icon}</span> {f.label}
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/listings"
            className="inline-block border-2 border-brand text-brand px-8 py-3 rounded-lg text-sm font-bold hover:bg-brand hover:text-white transition-all"
          >
            Explore All 2,500+ Properties
          </Link>
        </div>
      </div>
    </section>
  )
}
