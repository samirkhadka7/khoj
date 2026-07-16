'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, FileText, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { ALLOWED_MIME, MAX_BYTES } from './types'

/**
 * DocSlot — single document upload widget used 3× on the KYC documents step.
 *
 * Why a single component instead of inlining: the preview lifecycle (creating
 * an object URL for images, revoking on unmount) and the file-validation logic
 * are non-trivial. Hoisting them into one component avoids three near-identical
 * blocks in Step2.
 */
export function DocSlot({
  label,
  description,
  file,
  onPick,
}: {
  label: string
  description: string
  file: File | null
  onPick: (f: File | null) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Build a blob URL for image previews and revoke on cleanup so we don't leak refs
  useEffect(() => {
    if (!file || file.type === 'application/pdf') {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const handlePick = (f: File) => {
    if (!ALLOWED_MIME.includes(f.type)) {
      toast.error('Only JPG, PNG, or PDF allowed')
      return
    }
    if (f.size > MAX_BYTES) {
      toast.error('File must be under 5 MB')
      return
    }
    onPick(f)
  }

  return (
    <div className="bg-white border border-gray-100 rounded-md p-4 shadow-card">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="min-w-0">
          <div className="font-display font-bold text-[14px] text-gray-800">{label}</div>
          <div className="text-[12px] text-gray-400 mt-0.5">{description}</div>
        </div>
        <input
          ref={ref}
          type="file"
          accept={ALLOWED_MIME.join(',')}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            // Reset so picking the same file again still fires `change`
            e.target.value = ''
            if (f) handlePick(f)
          }}
        />
        {!file ? (
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-white border-[1.5px] border-primary rounded-sm text-[13px] font-semibold text-primary hover:bg-primary hover:text-white transition-colors flex-shrink-0"
          >
            <Upload size={13} strokeWidth={2.5} />
            Choose file
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onPick(null)}
            className="inline-flex items-center gap-1 h-9 px-3 bg-white border-[1.5px] border-gray-200 rounded-sm text-[13px] font-semibold text-gray-600 hover:border-red-300 hover:text-red-600 transition-colors flex-shrink-0"
          >
            <X size={13} strokeWidth={2.5} />
            Remove
          </button>
        )}
      </div>

      {file && (
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-sm p-2.5">
          <div className="w-14 h-14 rounded-sm overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt={file.name} className="w-full h-full object-cover" />
            ) : (
              <FileText size={22} className="text-gray-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-gray-800 truncate">{file.name}</div>
            <div className="text-[11.5px] text-gray-400 mt-0.5">
              {file.type === 'application/pdf' ? 'PDF' : 'Image'} ·{' '}
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
          <CheckCircle2 size={16} className="text-primary flex-shrink-0" />
        </div>
      )}
    </div>
  )
}
