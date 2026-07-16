'use client'

import Link from 'next/link'

/**
 * Landing top nav — Material-3 design. Sticky (not fixed) so the hero sits
 * directly beneath it. Brand colours come from the landing-scoped tokens.
 */
export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full bg-surface shadow-sm">
      <div className="flex justify-between items-center w-full px-5 md:px-12 max-w-container-max mx-auto h-20">
        <Link href="/" className="text-2xl font-bold text-brand">
          BaasKhoj
        </Link>

        <nav className="hidden md:flex gap-8 items-center">
          <Link
            href="/listings"
            className="text-brand border-b-2 border-brand pb-1 text-sm font-medium hover:text-brand transition-colors duration-200"
          >
            Browse
          </Link>
          <Link
            href="/listings"
            className="text-on-surface-variant font-medium text-sm hover:text-brand transition-colors duration-200"
          >
            Listings
          </Link>
          <Link
            href="#how"
            className="text-on-surface-variant font-medium text-sm hover:text-brand transition-colors duration-200"
          >
            How it Works
          </Link>
          <Link
            href="/blog"
            className="text-on-surface-variant font-medium text-sm hover:text-brand transition-colors duration-200"
          >
            Blog
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/auth/login"
            className="text-on-surface-variant text-sm font-medium hover:text-brand transition-all active:opacity-70"
          >
            Login
          </Link>
          <Link
            href="/auth/register?role=owner"
            className="bg-brand text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:shadow-lg transition-all active:scale-95"
          >
            Post Property
          </Link>
        </div>
      </div>
    </header>
  )
}
