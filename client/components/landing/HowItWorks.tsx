interface Step {
  icon: string // Material Symbols name
  name: string
  desc: string
}

const steps: Step[] = [
  {
    icon: 'search_insights',
    name: 'Search & Filter',
    desc: 'Filter by location, price, and amenities to find your match.',
  },
  {
    icon: 'fact_check',
    name: 'Check Verification',
    desc: 'Look for the verified badge to ensure property safety and authenticity.',
  },
  {
    icon: 'event_available',
    name: 'Book a Viewing',
    desc: 'Schedule a visit directly through our platform with the owner.',
  },
  {
    icon: 'vpn_key',
    name: 'Move In',
    desc: 'Finalize legal details and move into your new perfect space!',
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="py-24 px-5 md:px-12 max-w-container-max mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl font-semibold text-brand mb-4">How BaasKhoj Works</h2>
        <p className="text-lg text-on-surface-variant max-w-2xl mx-auto">
          We&apos;ve simplified the journey of finding your next home or office into four easy
          steps.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative">
        {/* Connective line — desktop only */}
        <div className="hidden md:block absolute top-12 left-1/4 right-1/4 h-0.5 bg-outline-variant/30 -z-10" />

        {steps.map((s) => (
          <div key={s.name} className="text-center">
            <div className="w-20 h-20 bg-brand text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <span className="material-symbols-outlined text-3xl">{s.icon}</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">{s.name}</h3>
            <p className="text-base text-on-surface-variant">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
