'use client'

import { Check } from 'lucide-react'
import clsx from 'clsx'

const STEPS = [
  { num: 1, label: 'Type' },
  { num: 2, label: 'Basics' },
  { num: 3, label: 'Details' },
  { num: 4, label: 'Amenities' },
  { num: 5, label: 'Photos' },
]

export function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
      {/* Top: step counter + progress bar */}
      <div className="max-w-[920px] mx-auto px-6 pt-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-bold text-primary uppercase tracking-[0.6px]">
            Step {currentStep} of 5
          </span>
          <span className="text-[12px] font-medium text-gray-400">
            {Math.round((currentStep / 5) * 100)}% complete
          </span>
        </div>
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Connected-circle stepper visualizer */}
      <div className="max-w-[760px] mx-auto px-6 py-5">
        <div className="relative flex justify-between items-start">
          {/* connector line behind the circles */}
          <div className="absolute top-5 left-5 right-5 h-px bg-gray-200 -z-0" />
          {STEPS.map((step) => {
            const done = step.num < currentStep
            const active = step.num === currentStep
            return (
              <div
                key={step.num}
                className="relative z-10 flex flex-col items-center gap-2 bg-white px-1"
              >
                <div
                  className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold transition-all',
                    done && 'bg-primary text-white',
                    active && 'bg-primary text-white ring-4 ring-primary/20',
                    !done && !active && 'bg-white border-2 border-gray-200 text-gray-400'
                  )}
                >
                  {done ? <Check size={16} strokeWidth={3} /> : step.num}
                </div>
                <span
                  className={clsx(
                    'text-[12px] font-semibold hidden sm:block',
                    active ? 'text-dark' : done ? 'text-primary' : 'text-gray-400'
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
