import Link from 'next/link'
import { ReactNode } from 'react'

/**
 * AuthShell — page wrapper for /auth/login and /auth/register.
 *
 * Renders the soft radial-gradient background, the centered card with
 * the green-to-mint accent strip across the top, the logo, and the
 * heading/subheading block. Children render the form body.
 */

interface AuthShellProps {
  heading: string
  subheading: string
  children: ReactNode
  /** Optional footer rendered below the card (e.g. trust badges) */
  footer?: ReactNode
}

export function AuthShell({ heading, subheading, children, footer }: AuthShellProps) {
  return (
    <div className="relative min-h-screen w-full bg-offWhite px-6 py-12 flex items-center justify-center">
      {/* Soft brand-tinted radial gradients — matches design `.bg-deco` */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 15% 20%, rgba(29,158,117,.06) 0%, transparent 40%),
            radial-gradient(circle at 85% 80%, rgba(8,80,65,.05) 0%, transparent 40%)
          `,
        }}
      />

      <main className="relative z-10 w-full max-w-[400px]">
        <div
          className="bg-white rounded-xl border border-gray-100 overflow-hidden"
          style={{ boxShadow: '0 16px 48px rgba(0,0,0,.12)' }}
        >
          {/* Top accent strip */}
          <div
            className="h-1"
            style={{
              background:
                'linear-gradient(90deg, var(--dark) 0%, var(--primary) 50%, #5dce9e 100%)',
            }}
          />

          <div className="px-8 pt-8 pb-7">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center justify-center gap-0 mb-6 no-underline"
            >
              <span className="font-display font-extrabold text-[24px] text-dark tracking-[-0.5px]">
                Baas<span className="text-primary">Khoj</span>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary ml-[3px] mb-[14px] flex-shrink-0" />
            </Link>

            {/* Heading */}
            <h1 className="font-display font-extrabold text-[21px] text-gray-800 tracking-[-0.3px] text-center mb-1.5">
              {heading}
            </h1>
            <p className="text-[14px] text-gray-500 text-center leading-[1.5] mb-[26px]">
              {subheading}
            </p>

            {children}
          </div>
        </div>

        {footer}
      </main>
    </div>
  )
}
