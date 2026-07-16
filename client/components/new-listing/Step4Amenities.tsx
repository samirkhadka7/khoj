'use client'

import { useFormContext } from 'react-hook-form'
import { Check } from 'lucide-react'
import clsx from 'clsx'
import { AMENITIES_LIST, type NewListingForm } from './schema'
import { StepNav } from './StepNav'

interface Step4Props {
  onBack: () => void
  onNext: () => void
}

export function Step4Amenities({ onBack, onNext }: Step4Props) {
  const { watch, setValue } = useFormContext<NewListingForm>()
  const amenities = watch('amenities') || []

  const toggle = (a: string) => {
    const next = amenities.includes(a)
      ? amenities.filter((x) => x !== a)
      : [...amenities, a]
    setValue('amenities', next, { shouldDirty: true })
  }

  return (
    <div className="px-6 py-8 max-w-[760px] mx-auto">
      <h1 className="text-[28px] font-extrabold text-dark tracking-tight mb-2">
        What&apos;s included?
      </h1>
      <p className="text-[14px] text-gray-500 mb-8 leading-relaxed">
        Pick everything that applies. These show up as filters when tenants search.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {AMENITIES_LIST.map((a) => {
          const active = amenities.includes(a)
          return (
            <button
              key={a}
              type="button"
              onClick={() => toggle(a)}
              className={clsx(
                'relative h-12 px-3 rounded-xl border-[1.5px] font-semibold text-[13.5px] transition-all flex items-center justify-center gap-2 text-center',
                active
                  ? 'border-primary bg-primary text-white shadow-[0_2px_8px_rgba(6,78,59,.2)]'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-primary/40 hover:bg-primary-subtle/40'
              )}
            >
              {active && <Check size={13} strokeWidth={3} />}
              {a}
            </button>
          )
        })}
      </div>

      <div className="mt-5 text-[12.5px] text-gray-400 text-center">
        {amenities.length} selected — you can pick none if your space doesn&apos;t advertise
        amenities.
      </div>

      <StepNav onBack={onBack} onNext={onNext} />
    </div>
  )
}
