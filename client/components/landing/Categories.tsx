import Link from 'next/link'

interface Category {
  slug: 'hostel' | 'room' | 'office' | 'business'
  icon: string // Material Symbols name
  name: string
  count: string
}

const categories: Category[] = [
  { slug: 'hostel', icon: 'bed', name: 'Hostel', count: '420+ Listings' },
  { slug: 'room', icon: 'apartment', name: 'Room/Flat', count: '1,200+ Listings' },
  { slug: 'office', icon: 'work', name: 'Office Rent', count: '85 Listings' },
  { slug: 'business', icon: 'store', name: 'Business Space', count: '150+ Listings' },
]

export function Categories() {
  return (
    <section id="categories" className="py-20 px-5 md:px-12 max-w-container-max mx-auto">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-3xl font-semibold text-brand">Browse by Category</h2>
          <p className="text-base text-on-surface-variant">Tailored searches for every need</p>
        </div>
        <Link
          href="/listings"
          className="text-brand text-sm font-medium hidden sm:flex items-center gap-1 group"
        >
          View All Categories
          <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/listings?type=${c.slug}`}
            className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant hover:border-brand/30 hover:shadow-lg transition-all text-center group cursor-pointer"
          >
            <div className="w-16 h-16 bg-secondary-container rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-brand text-3xl">{c.icon}</span>
            </div>
            <h3 className="text-xl font-semibold mb-1">{c.name}</h3>
            <p className="text-xs font-semibold text-on-surface-variant">{c.count}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
