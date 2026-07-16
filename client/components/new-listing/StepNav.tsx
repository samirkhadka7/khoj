'use client'

import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'

/**
 * Shared bottom navigation for every Add-Listing / Edit-Listing step.
 * Pill buttons (rounded-full) consistent with Step 1, per the Stitch design.
 */
export function StepNav({
  onBack,
  onNext,
  backLabel = 'Back',
  nextLabel = 'Next Step',
  nextDisabled = false,
  loading = false,
}: {
  onBack: () => void
  onNext: () => void
  backLabel?: string
  nextLabel?: string
  nextDisabled?: boolean
  loading?: boolean
}) {
  return (
    <div className="flex justify-between items-center mt-10">
      <button
        type="button"
        onClick={onBack}
        disabled={loading}
        className="inline-flex items-center gap-2 h-12 px-6 bg-white border-[1.5px] border-gray-200 rounded-full font-semibold text-[14px] text-gray-700 hover:border-gray-400 hover:text-dark transition-colors disabled:opacity-50"
      >
        <ArrowLeft size={16} />
        {backLabel}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled || loading}
        className="inline-flex items-center gap-2 h-12 px-8 bg-primary text-white border-none rounded-full text-[14px] font-bold hover:bg-dark hover:-translate-y-px transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:translate-y-0"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {nextLabel}
          </>
        ) : (
          <>
            {nextLabel}
            <ArrowRight size={16} strokeWidth={2.5} />
          </>
        )}
      </button>
    </div>
  )
}
