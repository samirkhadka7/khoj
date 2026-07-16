'use client'

import { ArrowRight } from 'lucide-react'
import { NEPAL_DISTRICTS } from '@/components/new-listing/schema'
import { Field, inputCls } from './formPrimitives'
import type { StepInfo } from './types'

/**
 * Step 1 — legal name, phone, and address.
 * Validation runs in the parent (BecomeOwnerPage) so this component stays
 * presentational + only emits data via setState callback.
 */
export function Step1PersonalInfo({
  info,
  setInfo,
  onNext,
}: {
  info: StepInfo
  setInfo: React.Dispatch<React.SetStateAction<StepInfo>>
  onNext: () => void
}) {
  return (
    <div className="space-y-4">
      <h2 className="font-display font-extrabold text-[20px] text-gray-800 tracking-[-0.3px]">
        Personal information
      </h2>
      <p className="text-[13.5px] text-gray-600 leading-[1.6]">
        Use the exact name as printed on your citizenship card.
      </p>

      <Field label="Legal Full Name" required>
        <input
          type="text"
          value={info.legalName}
          onChange={(e) => setInfo((s) => ({ ...s, legalName: e.target.value }))}
          placeholder="As shown on your citizenship card"
          className={inputCls()}
        />
      </Field>

      <Field label="Phone Number" required hint="OTP verification coming soon">
        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-[13.5px] font-semibold text-gray-400">
            +977
          </span>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={info.phone}
            onChange={(e) => setInfo((s) => ({ ...s, phone: e.target.value }))}
            placeholder="9812345678"
            className={`${inputCls()} pl-14`}
          />
        </div>
      </Field>

      <div className="grid sm:grid-cols-2 grid-cols-1 gap-4">
        <Field label="District" required>
          <select
            value={info.district}
            onChange={(e) => setInfo((s) => ({ ...s, district: e.target.value }))}
            className={`${inputCls()} appearance-none cursor-pointer pr-8`}
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%239ba3ad' d='M1 1l5 5 5-5'/%3E%3C/svg%3E\")",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
            }}
          >
            {NEPAL_DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Area / Neighborhood" required>
          <input
            type="text"
            value={info.area}
            onChange={(e) => setInfo((s) => ({ ...s, area: e.target.value }))}
            placeholder="Koteshwor, Lazimpat…"
            className={inputCls()}
          />
        </Field>
      </div>

      <div className="flex justify-end mt-6">
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 h-11 px-6 bg-primary text-white border-none rounded-sm font-display text-[14px] font-bold hover:bg-dark hover:-translate-y-px transition-all"
        >
          Next
          <ArrowRight size={14} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
