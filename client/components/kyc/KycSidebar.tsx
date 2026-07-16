'use client'

import { CheckCircle2, Mail, Phone, ShieldCheck } from 'lucide-react'

/**
 * Right-rail panel shown alongside the KYC form (Stitch "Verification Portal").
 * Two cards: "Why Verify?" benefits + "Need Help?" support contacts.
 */
export function KycSidebar() {
  return (
    <div className="space-y-6 lg:sticky lg:top-6">
      {/* Why verify */}
      <div className="bg-dark rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={18} className="text-brand-fg" strokeWidth={2.2} />
          <h3 className="text-[16px] font-bold">Why Verify?</h3>
        </div>
        <ul className="space-y-3 list-none">
          {[
            'Boost listing visibility by up to 40%',
            'Gain trust from premium tenants',
            'Unlock advanced property management tools',
          ].map((t) => (
            <li key={t} className="flex items-start gap-2.5 text-[13.5px] text-white/85">
              <CheckCircle2 size={16} className="text-brand-fg flex-shrink-0 mt-0.5" strokeWidth={2.2} />
              {t}
            </li>
          ))}
        </ul>
      </div>

      {/* Need help */}
      <div className="bg-white border border-gray-200/70 rounded-2xl p-6 shadow-card">
        <h3 className="text-[15px] font-bold text-dark mb-4">Need Help?</h3>
        <a
          href="mailto:support@baaskhoj.com.np"
          className="flex items-center gap-3 mb-3 group no-underline"
        >
          <span className="w-9 h-9 rounded-lg bg-primary-subtle flex items-center justify-center text-primary flex-shrink-0">
            <Mail size={15} />
          </span>
          <div className="min-w-0">
            <div className="text-[12px] text-gray-400">Email Support</div>
            <div className="text-[13.5px] font-semibold text-gray-800 group-hover:text-primary transition-colors truncate">
              support@baaskhoj.com.np
            </div>
          </div>
        </a>
        <a href="tel:+97714000000" className="flex items-center gap-3 group no-underline">
          <span className="w-9 h-9 rounded-lg bg-primary-subtle flex items-center justify-center text-primary flex-shrink-0">
            <Phone size={15} />
          </span>
          <div className="min-w-0">
            <div className="text-[12px] text-gray-400">Call Us</div>
            <div className="text-[13.5px] font-semibold text-gray-800 group-hover:text-primary transition-colors">
              +977 1-4XXXXXX
            </div>
          </div>
        </a>
      </div>

      {/* Review-time note */}
      <p className="text-[12px] text-gray-400 leading-relaxed px-1">
        Your identity verification is reviewed by our team within 24–48 business hours after all
        steps are completed. Documents are encrypted and never shared publicly.
      </p>
    </div>
  )
}
