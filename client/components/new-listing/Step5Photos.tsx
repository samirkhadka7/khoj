'use client'

import { useEffect, useRef, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { ArrowLeft, Image as ImageIcon, Loader2, Star, Upload, X } from 'lucide-react'
import clsx from 'clsx'
import type { NewListingForm } from './schema'

interface Step5Props {
  onBack: () => void
  onSubmit: () => void
  submitting: boolean
}

const MAX_PHOTOS = 10
const MAX_BYTES_PER_FILE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export function Step5Photos({ onBack, onSubmit, submitting }: Step5Props) {
  const { watch, setValue } = useFormContext<NewListingForm>()
  const photos = watch('photos') || []

  const [previews, setPreviews] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [reorderFromIdx, setReorderFromIdx] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Manage object URLs — revoke on cleanup so we don't leak blob refs
  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f))
    setPreviews(urls)
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [photos])

  const addFiles = (files: FileList | File[]) => {
    const incoming = Array.from(files)
    const valid: File[] = []
    const errors: string[] = []

    for (const f of incoming) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        errors.push(`${f.name}: unsupported format`)
        continue
      }
      if (f.size > MAX_BYTES_PER_FILE) {
        errors.push(`${f.name}: over 5MB`)
        continue
      }
      valid.push(f)
    }

    if (errors.length > 0) {
      // Surface batch errors via alert so we don't depend on toast wiring here
      alert(errors.join('\n'))
    }

    const next = [...photos, ...valid].slice(0, MAX_PHOTOS)
    setValue('photos', next, { shouldDirty: true })
  }

  const removeAt = (idx: number) => {
    const next = photos.filter((_, i) => i !== idx)
    setValue('photos', next, { shouldDirty: true })
  }

  const reorder = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return
    const next = [...photos]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    setValue('photos', next, { shouldDirty: true })
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  return (
    <div className="px-6 py-8 max-w-[760px] mx-auto">
      <h1 className="text-[28px] font-extrabold text-dark tracking-tight mb-2">
        Add some photos
      </h1>
      <p className="text-[14px] text-gray-500 mb-8 leading-relaxed">
        Listings with photos get 3× more contact requests. Drag to reorder — first one is the
        cover image.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          'relative cursor-pointer rounded-md border-[2px] border-dashed transition-all p-10 text-center',
          dragOver
            ? 'border-primary bg-primary-subtle/50'
            : 'border-gray-200 bg-gray-50 hover:bg-white hover:border-primary'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files)
            e.target.value = '' // allow re-upload of the same file
          }}
        />
        <div className="w-14 h-14 mx-auto mb-3 bg-primary-subtle rounded-full flex items-center justify-center">
          <Upload size={22} className="text-primary" strokeWidth={2.2} />
        </div>
        <div className="font-display font-bold text-[15px] text-gray-800 mb-1">
          {dragOver ? 'Drop to upload' : 'Drag photos here or click to browse'}
        </div>
        <div className="text-[12.5px] text-gray-400">
          Up to {MAX_PHOTOS} photos · JPG, PNG, WEBP · Max 5 MB each
        </div>
      </div>

      {/* Preview grid */}
      {photos.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-[14px] text-gray-800">
              {photos.length} photo{photos.length === 1 ? '' : 's'}
              <span className="text-gray-400 font-normal ml-1">/ {MAX_PHOTOS}</span>
            </h3>
            {photos.length > 1 && (
              <span className="text-[11.5px] text-gray-400">Drag thumbnails to reorder</span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                draggable
                onDragStart={() => setReorderFromIdx(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (reorderFromIdx !== null) reorder(reorderFromIdx, idx)
                  setReorderFromIdx(null)
                }}
                onDragEnd={() => setReorderFromIdx(null)}
                className={clsx(
                  'relative aspect-[4/3] rounded-md overflow-hidden border-[1.5px] cursor-move group',
                  reorderFromIdx === idx ? 'opacity-50 border-primary' : 'border-gray-100'
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previews[idx]}
                  alt={`Photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                {idx === 0 && (
                  <div className="absolute top-2 left-2 bg-primary text-white text-[10px] font-bold uppercase tracking-[0.5px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                    <Star size={9} strokeWidth={3} className="fill-white" />
                    Cover
                  </div>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeAt(idx)
                  }}
                  aria-label="Remove photo"
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-black text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <X size={12} strokeWidth={3} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent text-white text-[10.5px] px-2 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                  {file.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {photos.length === 0 && (
        <div className="mt-5 px-3 py-2.5 bg-accent-subtle/40 border border-accent-light/30 rounded-sm flex items-center gap-2">
          <ImageIcon size={14} className="text-accent flex-shrink-0" />
          <span className="text-[12.5px] text-accent">
            Optional but recommended — listings without photos rarely get inquiries.
          </span>
        </div>
      )}

      {/* Footer — final step uses a custom "Publish" CTA */}
      <div className="flex justify-between items-center mt-10">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="inline-flex items-center gap-2 h-12 px-6 bg-white border-[1.5px] border-gray-200 rounded-full font-semibold text-[14px] text-gray-700 hover:border-gray-400 hover:text-dark transition-colors disabled:opacity-50"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="inline-flex items-center gap-2 h-12 px-8 bg-primary text-white border-none rounded-full text-[14px] font-bold hover:bg-dark hover:-translate-y-px transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:translate-y-0"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Publishing...
            </>
          ) : (
            'Publish Listing'
          )}
        </button>
      </div>
    </div>
  )
}
