'use client'

import { Camera, ChevronLeft, FileText, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import type { StepDocs, StepInfo } from './types'

/**
 * Step 3 — read-only summary, confirm checkbox, submit.
 * `submitting` and `confirmed` flow up to the parent so the page can call
 * the multipart submit handler.
 */
export function Step3Review({
  info,
  docs,
  confirmed,
  setConfirmed,
  onBack,
  onSubmit,
  submitting,
}: {
  info: StepInfo
  docs: StepDocs
  confirmed: boolean
  setConfirmed: (v: boolean) => void
  onBack: () => void
  onSubmit: () => void
  submitting: boolean
}) {
  return (
    <div>
      <h2 className="font-display font-extrabold text-[20px] text-gray-800 tracking-[-0.3px]">
        Review and submit
      </h2>
      <p className="text-[13.5px] text-gray-600 mt-1 mb-5 leading-[1.6]">
        Verify everything below before submitting. Once submitted, you can&apos;t edit until
        admin reviews.
      </p>

      <div className="bg-white border border-gray-100 rounded-md shadow-card overflow-hidden">
        <SummaryRow label="Legal name" value={info.legalName} />
        <SummaryRow label="Phone" value={`+977 ${info.phone}`} />
        <SummaryRow label="District" value={info.district} />
        <SummaryRow label="Area" value={info.area} />
        <SummaryRow
          label="Citizenship front"
          value={docs.citizenshipFront ? <DocChip file={docs.citizenshipFront} /> : '—'}
        />
        <SummaryRow
          label="Citizenship back"
          value={docs.citizenshipBack ? <DocChip file={docs.citizenshipBack} /> : '—'}
        />
        <SummaryRow
          label="Selfie with ID"
          value={docs.selfieWithId ? <DocChip file={docs.selfieWithId} /> : '—'}
          last
        />
      </div>

      <label className="flex items-start gap-3 mt-5 cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-primary"
        />
        <span className="text-[13.5px] text-gray-700 leading-[1.5]">
          I confirm all info is genuine and the documents belong to me. False info may result
          in permanent account suspension.
        </span>
      </label>

      <div className="flex justify-between items-center mt-7">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="inline-flex items-center gap-2 h-11 px-5 bg-white border-[1.5px] border-gray-200 rounded-sm font-semibold text-[14px] text-gray-800 hover:border-gray-400 transition-colors disabled:opacity-50"
        >
          <ChevronLeft size={14} />
          Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!confirmed || submitting}
          className="inline-flex items-center gap-2 h-11 px-7 bg-primary text-white border-none rounded-sm font-display text-[14px] font-bold hover:bg-dark hover:-translate-y-px transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:translate-y-0"
        >
          {submitting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Application'
          )}
        </button>
      </div>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  last,
}: {
  label: string
  value: React.ReactNode
  last?: boolean
}) {
  return (
    <div
      className={clsx(
        'flex items-start justify-between gap-4 px-4 py-3',
        !last && 'border-b border-gray-100'
      )}
    >
      <div className="text-[12px] font-bold text-gray-400 uppercase tracking-[0.6px] flex-shrink-0">
        {label}
      </div>
      <div className="text-[13.5px] text-gray-800 text-right break-words">{value}</div>
    </div>
  )
}

function DocChip({ file }: { file: File }) {
  const Icon = file.type === 'application/pdf' ? FileText : Camera
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-dark-mid bg-primary-subtle px-2 py-0.5 rounded-full">
      <Icon size={11} />
      {file.name}
    </span>
  )
}
