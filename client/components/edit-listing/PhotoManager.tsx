'use client'

import { useRef, useState } from 'react'
import { Loader2, Plus, Star, Upload, X } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import api from '@/lib/axios'
import type { ApiResponse, Listing } from '@/types'

const MAX_PHOTOS = 10
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

interface PhotoManagerProps {
  listingId: string
  images: string[]
  onChange: (next: string[]) => void
}

/**
 * Independent gallery widget — manages a listing's images on its own.
 * Each add/remove hits the backend immediately rather than waiting for the
 * page-level save, because photos are an independent concern from text fields.
 */
export function PhotoManager({ listingId, images, onChange }: PhotoManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [removingUrl, setRemovingUrl] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const remaining = MAX_PHOTOS - images.length

  const validate = (files: File[]): File[] => {
    const valid: File[] = []
    const errs: string[] = []
    for (const f of files) {
      if (!ALLOWED_TYPES.includes(f.type)) errs.push(`${f.name}: unsupported format`)
      else if (f.size > MAX_BYTES) errs.push(`${f.name}: over 5MB`)
      else valid.push(f)
    }
    if (valid.length > remaining) {
      errs.push(`Only ${remaining} more allowed (max ${MAX_PHOTOS} total)`)
      valid.length = remaining
    }
    if (errs.length) toast.error(errs.join('\n'))
    return valid
  }

  const upload = async (files: File[]) => {
    const valid = validate(files)
    if (valid.length === 0) return

    setUploading(true)
    try {
      const fd = new FormData()
      valid.forEach((f) => fd.append('images', f))
      const { data } = await api.post<ApiResponse<Listing>>(
        `/api/listings/${listingId}/images`,
        fd
      )
      if (data.success && data.data) {
        onChange(data.data.images)
        toast.success(`${valid.length} photo${valid.length === 1 ? '' : 's'} added`)
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const remove = async (url: string) => {
    if (images.length === 1) {
      if (!confirm('This is your only photo. Remove anyway?')) return
    }
    setRemovingUrl(url)
    try {
      const { data } = await api.delete<ApiResponse<Listing>>(
        `/api/listings/${listingId}/images?url=${encodeURIComponent(url)}`
      )
      if (data.success && data.data) {
        onChange(data.data.images)
        toast.success('Photo removed')
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Could not remove photo')
    } finally {
      setRemovingUrl(null)
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) upload(Array.from(e.dataTransfer.files))
  }

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-card">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h2 className="font-display font-extrabold text-[15px] text-gray-800">
            Photos
            <span className="text-gray-400 font-medium ml-2">
              {images.length} / {MAX_PHOTOS}
            </span>
          </h2>
          <p className="text-[11.5px] text-gray-400 mt-0.5">
            First photo is the cover. Changes save instantly.
          </p>
        </div>
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-white border-[1.5px] border-primary rounded-sm text-[13px] font-semibold text-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Plus size={13} strokeWidth={2.5} />
            )}
            Add Photos
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) upload(Array.from(e.target.files))
          e.target.value = ''
        }}
      />

      {images.length === 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={clsx(
            'cursor-pointer rounded-md border-[2px] border-dashed transition-all p-8 text-center',
            dragOver
              ? 'border-primary bg-primary-subtle/50'
              : 'border-gray-200 bg-gray-50 hover:bg-white hover:border-primary'
          )}
        >
          <div className="w-12 h-12 mx-auto mb-2 bg-primary-subtle rounded-full flex items-center justify-center">
            <Upload size={18} className="text-primary" strokeWidth={2.2} />
          </div>
          <div className="font-display font-bold text-[14px] text-gray-800">
            {dragOver ? 'Drop to upload' : 'Drag photos here or click to browse'}
          </div>
          <div className="text-[12px] text-gray-400 mt-0.5">
            Up to 10 photos · JPG, PNG, WEBP · Max 5 MB each
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            // Allow drag-drop into the populated grid — adds more photos.
            // Don't preventDefault on individual cards, only on the container.
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={clsx(
            'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 rounded-sm transition-colors',
            dragOver && 'bg-primary-subtle/30 outline outline-2 outline-primary outline-offset-2'
          )}
        >
          {images.map((url, idx) => {
            const removing = removingUrl === url
            return (
              <div
                key={url}
                className="relative aspect-[4/3] rounded-md overflow-hidden border-[1.5px] border-gray-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Photo ${idx + 1}`}
                  className={clsx(
                    'w-full h-full object-cover transition-opacity',
                    removing && 'opacity-30'
                  )}
                />
                {idx === 0 && (
                  <div className="absolute top-2 left-2 bg-primary text-white text-[10px] font-bold uppercase tracking-[0.5px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                    <Star size={9} strokeWidth={3} className="fill-white" />
                    Cover
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => remove(url)}
                  disabled={removing}
                  aria-label="Remove photo"
                  className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/60 hover:bg-black text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  {removing ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <X size={12} strokeWidth={3} />
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
