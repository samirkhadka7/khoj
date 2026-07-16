'use client'

import { Check } from 'lucide-react'
import clsx from 'clsx'

const STEPS = ['Personal Info', 'Documents', 'Review']

/**
 * 3-step progress indicator pinned to the top of the KYC form.
 * Sticky so it stays visible as the user scrolls long forms.
 */
export function KycStepper({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
      <div className="max-w-[800px] mx-auto px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] font-bold text-primary uppercase tracking-[0.6px]">
            Step {currentStep} of 3
          </span>
          <span className="text-[12px] font-medium text-gray-400">
            {Math.round((currentStep / 3) * 100)}% complete
          </span>
        </div>
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11.5px]">
          {STEPS.map((label, idx) => {
            const num = idx + 1
            const done = num < currentStep
            const active = num === currentStep
            return (
              <div key={label} className="flex items-center gap-1.5">
                <span
                  className={clsx(
                    'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                    done && 'bg-primary text-white',
                    active && 'bg-primary text-white ring-[2px] ring-primary/20',
                    !done && !active && 'bg-gray-100 text-gray-400'
                  )}
                >
                  {done ? <Check size={10} strokeWidth={3} /> : num}
                </span>
                <span
                  className={clsx(
                    'font-medium hidden sm:inline',
                    active ? 'text-dark' : done ? 'text-primary' : 'text-gray-400'
                  )}
                >
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
