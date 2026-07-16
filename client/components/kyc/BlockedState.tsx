'use client'

import Link from 'next/link'
import { CheckCircle2, ShieldCheck } from 'lucide-react'
import clsx from 'clsx'

/**
 * Shown when the user already has a pending or approved KYC — they can't
 * (re)submit while either of those is true. Rejected users see the form
 * with a banner instead, not this blocker.
 */
export function BlockedState({
  kind,
  title,
  message,
  cta,
}: {
  kind: 'approved' | 'pending'
  title: string
  message: string
  cta: { href: string; label: string }
}) {
  return (
    <div className="px-8 py-12">
      <div className="bg-white border border-gray-100 rounded-lg p-10 text-center max-w-[480px] mx-auto shadow-card">
        <div
          className={clsx(
            'w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center',
            kind === 'approved'
              ? 'bg-primary-subtle text-primary'
              : 'bg-accent-subtle text-accent'
          )}
        >
          {kind === 'approved' ? (
            <CheckCircle2 size={26} strokeWidth={2.2} />
          ) : (
            <ShieldCheck size={26} strokeWidth={2.2} />
          )}
        </div>
        <h1 className="font-display font-extrabold text-[20px] text-gray-800 mb-2">{title}</h1>
        <p className="text-[14px] text-gray-600 mb-5">{message}</p>
        <Link
          href={cta.href}
          className="inline-block h-10 px-5 bg-primary text-white rounded-sm font-semibold text-[14px] hover:bg-dark transition-colors leading-[40px]"
        >
          {cta.label}
        </Link>
      </div>
    </div>
  )
}
