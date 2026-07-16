'use client'

import { Check } from 'lucide-react'
import clsx from 'clsx'

const STEPS = [
  { num: 1, label: 'Basics' },
  { num: 2, label: 'Details' },
  { num: 3, label: 'Amenities' },
]

/**
 * 3-step stepper for the edit flow. Type and photos are managed outside the
 * stepper (type is locked at creation; photos use the dedicated PhotoManager).
 */
export function EditStepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
      <div className="max-w-[800px] mx-auto px-6 py-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] font-bold text-primary uppercase tracking-[0.6px]">
            Step {currentStep} of 3
          </span>
          <span className="text-[12px] font-medium text-gray-400">
            {Math.round((currentStep / 3) * 100)}% complete
          </span>
        </div>

        <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          {STEPS.map((step) => {
            const done = step.num < currentStep
            const active = step.num === currentStep
            return (
              <div key={step.num} className="flex flex-col items-center gap-1.5 flex-1">
                <div
                  className={clsx(
                    'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors',
                    done && 'bg-primary text-white',
                    active && 'bg-primary text-white ring-[3px] ring-primary/20',
                    !done && !active && 'bg-gray-100 text-gray-400'
                  )}
                >
                  {done ? <Check size={12} strokeWidth={3} /> : step.num}
                </div>
                <span
                  className={clsx(
                    'text-[11.5px] font-medium hidden sm:block',
                    active && 'text-dark',
                    done && 'text-primary',
                    !done && !active && 'text-gray-400'
                  )}
                >
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
