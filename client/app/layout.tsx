import type { Metadata } from 'next'
import { Hanken_Grotesk } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

/**
 * Hanken Grotesk — the single typeface across the whole app per the Stitch
 * "Modern Professional" design system. Self-hosted via next/font (zero layout
 * shift) and exposed as `--font-hanken`. Tailwind's `font-display` / `font-body`
 * / `font-hanken` utilities all resolve to this one family.
 */
const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-hanken',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'BaasKhoj — Find Your Perfect Space in Nepal',
  description:
    'Find verified rooms, hostels, offices, and business spaces across Nepal. Direct from owners, no middlemen.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={hanken.variable}>
      <head>
        {/* Material Symbols Outlined — icon font used by the redesigned pages */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-hanken">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: 'var(--font-hanken)',
              fontSize: '14px',
              borderRadius: '12px',
            },
          }}
        />
      </body>
    </html>
  )
}
