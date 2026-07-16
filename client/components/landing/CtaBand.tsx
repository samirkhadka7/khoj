import Link from 'next/link'

export function CtaBand() {
  return (
    <section className="py-20 px-5 md:px-12 max-w-container-max mx-auto mb-20">
      <div className="bg-brand-container rounded-[2rem] p-12 md:p-20 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-10">
        <div className="relative z-10 max-w-xl">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Own a Property in Nepal?
          </h2>
          <p className="text-lg text-brand-fg mb-8">
            Join thousands of landlords who trust BaasKhoj to find reliable tenants quickly and
            safely. Listing is free and takes less than 2 minutes.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/auth/register?role=owner"
              className="bg-brand text-white px-8 py-4 rounded-xl text-sm font-bold shadow-xl hover:scale-105 transition-transform"
            >
              List Your Property
            </Link>
            <Link
              href="#how"
              className="bg-white/10 text-white border border-white/20 px-8 py-4 rounded-xl text-sm font-bold hover:bg-white/20 transition-all"
            >
              How it Works for Landlords
            </Link>
          </div>
        </div>

        <div className="relative z-10 hidden lg:block">
          <div className="bg-white p-4 rounded-2xl shadow-2xl rotate-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="w-64 rounded-xl"
              alt="A modern residential building in Kathmandu representing the quality of properties listed on BaasKhoj."
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuA6LefkHhpc6IX4Nru7T0XXN77g1946vj5Nl2wrVCLnVG7TDRVVUcvk7dkh0-gREkQfd3ow1fbty5ZSpY8VfLAavrPd4sZ7lSyoYI1IP70RYzYUuBsd1kIn7uCb7edRzCXTGUlyoCIoloKeViv6YUXMSzyrdLBjuZF-IWZ_xarlVnpDdi6VWhgQL6SgLY9Kk1ZkcWOlGG756Wf8_2ZrcpJvyEMbH-JpXaYZFjWJe52NKM-wvTOgv0dKG17AKlUNijvWqiOiwQ5JUPvf"
            />
          </div>
        </div>

        {/* Abstract glow elements */}
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand/20 rounded-full blur-3xl" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-fg/10 rounded-full blur-3xl" />
      </div>
    </section>
  )
}
