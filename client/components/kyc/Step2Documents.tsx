'use client'

import { ArrowRight, ChevronLeft } from 'lucide-react'
import { DocSlot } from './DocSlot'
import type { StepDocs } from './types'

export function Step2Documents({
  docs,
  setDocs,
  onBack,
  onNext,
}: {
  docs: StepDocs
  setDocs: React.Dispatch<React.SetStateAction<StepDocs>>
  onBack: () => void
  onNext: () => void
}) {
  return (
    <div className="space-y-5">
      <h2 className="font-display font-extrabold text-[20px] text-gray-800 tracking-[-0.3px]">
        Upload your documents
      </h2>
      <p className="text-[13.5px] text-gray-600 leading-[1.6]">
        Make sure photos are clear and all four corners of the card are visible. Accepted:
        JPG, PNG, PDF · Max 5 MB each.
      </p>

      <DocSlot
        label="Citizenship / NID Front"
        description="Front side with your photo and number"
        file={docs.citizenshipFront}
        onPick={(f) => setDocs((s) => ({ ...s, citizenshipFront: f }))}
      />
      <DocSlot
        label="Citizenship / NID Back"
        description="Back side with the issuing details"
        file={docs.citizenshipBack}
        onPick={(f) => setDocs((s) => ({ ...s, citizenshipBack: f }))}
      />
      <DocSlot
        label="Selfie holding ID"
        description="A clear photo of you holding the citizenship card next to your face"
        file={docs.selfieWithId}
        onPick={(f) => setDocs((s) => ({ ...s, selfieWithId: f }))}
      />

      <div className="flex justify-between items-center mt-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 h-11 px-5 bg-white border-[1.5px] border-gray-200 rounded-sm font-semibold text-[14px] text-gray-800 hover:border-gray-400 transition-colors"
        >
          <ChevronLeft size={14} />
          Back
        </button>
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
