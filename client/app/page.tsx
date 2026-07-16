import { Navbar } from '@/components/landing/Navbar'
import { Hero } from '@/components/landing/Hero'
import { Categories } from '@/components/landing/Categories'
import { FeaturedListings } from '@/components/landing/FeaturedListings'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { CtaBand } from '@/components/landing/CtaBand'
import { Footer } from '@/components/landing/Footer'

export default function LandingPage() {
  // `font-hanken` + `bg-surface` scope the new Material-3 design tokens to the
  // landing page only — the rest of the app keeps its existing theme.
  return (
    <div className="font-hanken bg-surface text-on-surface overflow-x-hidden">
      <Navbar />
      <main>
        <Hero />
        <Categories />
        <FeaturedListings />
        <HowItWorks />
        <CtaBand />
      </main>
      <Footer />
    </div>
  )
}
