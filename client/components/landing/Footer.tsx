import Link from 'next/link'

const explore = ['Hostel', 'Room/Flat', 'Office Rent', 'Business Space']
const company = ['About Us', 'Blog', 'Pricing', 'Contact']
const legal = ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Help Center']

const socials = [
  { icon: 'face_nod', title: 'Facebook' },
  { icon: 'camera', title: 'Instagram' },
  { icon: 'alternate_email', title: 'Email' },
]

export function Footer() {
  return (
    <footer className="bg-surface-container-lowest border-t border-outline-variant">
      <div className="w-full py-16 px-5 md:px-12 max-w-container-max mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <div className="text-2xl font-bold text-brand mb-6">BaasKhoj</div>
          <p className="text-base text-on-surface-variant mb-6 leading-relaxed">
            Connecting property owners with seekers through trust, verification, and seamless
            technology across Nepal.
          </p>
          <div className="flex gap-4">
            {socials.map((s) => (
              <a
                key={s.title}
                href="#"
                title={s.title}
                className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-brand hover:bg-brand hover:text-white transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
              </a>
            ))}
          </div>
        </div>

        <FooterCol title="Explore" items={explore} />
        <FooterCol title="Company" items={company} />
        <FooterCol title="Legal" items={legal} />
      </div>

      <div className="max-w-container-max mx-auto px-5 md:px-12 py-8 border-t border-outline-variant/30 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-xs text-on-surface-variant">
          © 2024 BaasKhoj. All rights reserved. Verified &amp; Trusted Real Estate in Nepal.
        </p>
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          Made with
          <span className="text-error material-symbols-outlined fill-icon text-sm">favorite</span>
          in Kathmandu
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-sm font-bold text-on-surface mb-6 uppercase tracking-wider">{title}</h4>
      <ul className="flex flex-col gap-4">
        {items.map((i) => (
          <li key={i}>
            <Link
              href="/listings"
              className="text-on-surface-variant hover:text-brand text-base transition-colors"
            >
              {i}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
