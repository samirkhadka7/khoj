'use client'

import type { ReactNode } from 'react'

/**
 * Field — labelled wrapper used across all KYC step components.
 * Tiny by design; a more general primitive lives in components/new-listing/
 * but for the KYC flow specifically these styles are what the design uses.
 */
export function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-[7px]">
        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-[.6px]">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {hint && <span className="text-[11.5px] text-gray-400 font-medium">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export const inputCls = () =>
  'w-full h-11 px-3.5 font-body text-[14.5px] text-gray-800 bg-white border-[1.5px] border-gray-200 rounded-sm outline-none transition-[border-color,box-shadow] placeholder:text-gray-400 focus:border-primary focus:shadow-[0_0_0_3px_rgba(29,158,117,.1)]'
