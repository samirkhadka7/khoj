'use client'

import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { ArrowRight, Check } from 'lucide-react'
import clsx from 'clsx'
import type { ListingType } from '@/types'
import type { NewListingForm } from './schema'

const TYPES: {
  value: ListingType
  emoji: string
  name: string
  subtitle: string
  bg: string
  selectedBorder: string
}[] = [
  {
    value: 'hostel',
    emoji: '🏠',
    name: 'Hostel',
    subtitle: 'Student & professional hostels with shared amenities and community living.',
    bg: 'bg-[#E9F5F0]',
    selectedBorder: 'border-primary',
  },
  {
    value: 'room',
    emoji: '🛏️',
    name: 'Room / Flat',
    subtitle: 'Single rooms, 1BHK, 2BHK, and full apartments for private residential use.',
    bg: 'bg-[#EEF2FF]',
    selectedBorder: 'border-primary',
  },
  {
    value: 'office',
    emoji: '💼',
    name: 'Office Rent',
    subtitle: 'Private offices, co-working spaces, and dedicated corporate environments.',
    bg: 'bg-[#FFF9E6]',
    selectedBorder: 'border-primary',
  },
  {
    value: 'business',
    emoji: '🏪',
    name: 'Business Space',
    subtitle: 'Shops, showrooms, warehouses, and other commercial retail outlets.',
    bg: 'bg-[#FFF1F0]',
    selectedBorder: 'border-primary',
  },
]

export function Step1Type({ onNext }: { onNext: () => void }) {
  const { watch, setValue } = useFormContext<NewListingForm>()
  const selected = watch('type')

  // Default form has type='hostel' to satisfy types, so we track an explicit
  // "user clicked" flag locally to gate the Next button. Persists across the
  // step's lifecycle but resets if the user remounts the page (acceptable).
  const [touched, setTouched] = useState(false)

  const choose = (val: ListingType) => {
    setValue('type', val, { shouldDirty: true })
    setTouched(true)
  }

  return (
    <div className="px-6 py-12 max-w-[900px] mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-[32px] sm:text-[38px] font-extrabold text-dark tracking-tight mb-3">
          What are you listing?
        </h1>
        <p className="text-[15px] text-gray-500 max-w-[560px] mx-auto leading-relaxed">
          Pick the category that best describes your space. This helps your listing reach the right
          audience. <span className="text-accent font-semibold">You can&apos;t change this later.</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TYPES.map((t) => {
          const isSelected = touched && selected === t.value
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => choose(t.value)}
              className={clsx(
                'group relative text-left rounded-2xl p-7 border-2 transition-all duration-300 cursor-pointer',
                t.bg,
                isSelected
                  ? 'border-primary shadow-xl ring-2 ring-primary/15'
                  : 'border-transparent hover:border-primary/30 hover:shadow-xl'
              )}
            >
              {isSelected && (
                <div className="absolute top-5 right-5 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center">
                  <Check size={15} strokeWidth={3} />
                </div>
              )}
              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-[32px] mb-6 transition-transform duration-300 group-hover:scale-110">
                {t.emoji}
              </div>
              <div className="text-[20px] font-bold text-dark mb-2">{t.name}</div>
              <p className="text-[14px] text-gray-500 leading-relaxed">{t.subtitle}</p>
            </button>
          )
        })}
      </div>

      <div className="flex justify-end mt-10">
        <button
          type="button"
          onClick={onNext}
          disabled={!touched}
          className="inline-flex items-center gap-2 h-12 px-8 bg-primary text-white border-none rounded-full text-[14px] font-bold hover:bg-dark hover:-translate-y-px transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:translate-y-0"
        >
          Next Step
          <ArrowRight size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
