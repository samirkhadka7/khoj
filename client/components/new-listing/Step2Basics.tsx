'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { MapPin } from 'lucide-react'
import { StepNav } from './StepNav'
import { NEPAL_DISTRICTS, type NewListingForm } from './schema'

// Leaflet uses `window` — load the picker only on the client.
const MapPicker = dynamic(() => import('./MapPicker'), { ssr: false })

interface Step2BasicsProps {
  onBack: () => void
  onNext: () => Promise<void>
}

export function Step2Basics({ onBack, onNext }: Step2BasicsProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<NewListingForm>()

  const [mapOpen, setMapOpen] = useState(false)

  const description = watch('description') || ''
  const lat = watch('lat')
  const lng = watch('lng')
  const negotiable = watch('negotiable')
  const isAvailable = watch('isAvailable')

  return (
    <div className="px-6 py-8 max-w-[760px] mx-auto">
      <h1 className="text-[28px] font-extrabold text-dark tracking-tight mb-2">
        Tell us the basics
      </h1>
      <p className="text-[14px] text-gray-500 mb-8 leading-relaxed">
        Title, price, and where it&apos;s located. Tenants see this first.
      </p>

      <div className="space-y-5">
        {/* Title */}
        <Field label="Listing Title" error={errors.title?.message} required>
          <input
            type="text"
            placeholder="e.g. Sunny 2BHK with parking, near Patan Hospital"
            maxLength={100}
            {...register('title')}
            className={inputCls(!!errors.title)}
          />
        </Field>

        {/* Description */}
        <Field
          label="Description"
          required
          error={errors.description?.message}
          hint={`${description.length}/500 characters`}
        >
          <textarea
            placeholder="Describe the space, the neighborhood, what's included…"
            rows={5}
            maxLength={500}
            {...register('description')}
            className={`${inputCls(!!errors.description)} resize-none py-3 leading-[1.6]`}
          />
        </Field>

        {/* Price + negotiable */}
        <div className="grid sm:grid-cols-[1fr_220px] grid-cols-1 gap-4 items-end">
          <Field label="Price (NPR / month)" required error={errors.price?.message}>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13.5px] font-semibold text-gray-400">
                NPR
              </span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="15000"
                {...register('price')}
                className={`${inputCls(!!errors.price)} pl-14`}
              />
            </div>
          </Field>

          <div className="flex items-center justify-between bg-gray-50 border-[1.5px] border-gray-200 rounded-sm h-11 px-4">
            <span className="text-[13.5px] font-medium text-gray-800">Negotiable</span>
            <button
              type="button"
              onClick={() => setValue('negotiable', !negotiable, { shouldDirty: true })}
              className={`w-10 h-[22px] rounded-full p-0 relative transition-colors ${
                negotiable ? 'bg-primary' : 'bg-gray-300'
              }`}
              aria-pressed={negotiable}
            >
              <span
                className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform ${
                  negotiable ? 'translate-x-[18px]' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Listing availability — defaults to true on create, owner toggles when editing */}
        <div className="flex items-center justify-between bg-white border-[1.5px] border-gray-200 rounded-sm h-12 px-4">
          <div className="min-w-0 pr-3">
            <div className="text-[13.5px] font-medium text-gray-800">
              Currently available
            </div>
            <div className="text-[11.5px] text-gray-400 mt-0.5">
              Turn off if the space is occupied or you&apos;re not accepting requests.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setValue('isAvailable', !isAvailable, { shouldDirty: true })}
            className={`w-10 h-[22px] rounded-full p-0 relative transition-colors flex-shrink-0 ${
              isAvailable ? 'bg-primary' : 'bg-gray-300'
            }`}
            aria-pressed={isAvailable}
          >
            <span
              className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform ${
                isAvailable ? 'translate-x-[18px]' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Location heading */}
        <div className="pt-3">
          <h2 className="font-display font-bold text-[15px] text-gray-800 mb-1">Location</h2>
          <p className="text-[12.5px] text-gray-400">
            Tenants see the area + district. Exact lat/lng powers the map view.
          </p>
        </div>

        <Field label="Address" required error={errors.address?.message}>
          <input
            type="text"
            placeholder="House #, street, locality landmark"
            {...register('address')}
            className={inputCls(!!errors.address)}
          />
        </Field>

        <div className="grid sm:grid-cols-2 grid-cols-1 gap-4">
          <Field label="Area / Neighborhood" required error={errors.area?.message}>
            <input
              type="text"
              placeholder="Koteshwor, Lazimpat, Kupondole…"
              {...register('area')}
              className={inputCls(!!errors.area)}
            />
          </Field>

          <Field label="District" required error={errors.district?.message}>
            <select
              {...register('district')}
              className={`${inputCls(!!errors.district)} appearance-none cursor-pointer pr-8`}
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%239ba3ad' d='M1 1l5 5 5-5'/%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
              }}
            >
              {NEPAL_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Lat / Lng */}
        <div className="bg-gray-50 border border-gray-100 rounded-md p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <div className="text-[13px] font-bold text-gray-800">Pin location on map</div>
              <div className="text-[12px] text-gray-400 mt-0.5 font-mono tabular-nums">
                lat {Number(lat || 0).toFixed(5)}, lng {Number(lng || 0).toFixed(5)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMapOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-4 bg-white border-[1.5px] border-primary rounded-sm font-semibold text-[13px] text-primary hover:bg-primary hover:text-white transition-colors"
            >
              <MapPin size={13} strokeWidth={2.5} />
              Pick on Map
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              step="any"
              placeholder="Latitude"
              {...register('lat')}
              className={inputCls(!!errors.lat) + ' h-9 text-[13px]'}
            />
            <input
              type="number"
              step="any"
              placeholder="Longitude"
              {...register('lng')}
              className={inputCls(!!errors.lng) + ' h-9 text-[13px]'}
            />
          </div>
          {(errors.lat || errors.lng) && (
            <p className="mt-1.5 text-[12px] text-red-600">
              {errors.lat?.message || errors.lng?.message}
            </p>
          )}
        </div>
      </div>

      {/* Map modal */}
      <MapPicker
        open={mapOpen}
        initialLat={Number(lat) || 27.7172}
        initialLng={Number(lng) || 85.324}
        onPick={(la, lo) => {
          setValue('lat', la, { shouldValidate: true })
          setValue('lng', lo, { shouldValidate: true })
        }}
        onClose={() => setMapOpen(false)}
      />

      <StepNav onBack={onBack} onNext={() => void onNext()} />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Form-field primitives shared across step components in this folder.       */
/* -------------------------------------------------------------------------- */

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-[7px]">
        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-[.6px]">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {hint && <span className="text-[11.5px] text-gray-400 font-medium">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1 text-[12px] text-red-600">{error}</p>}
    </div>
  )
}

const inputCls = (err: boolean) =>
  `w-full h-11 px-3.5 font-body text-[14.5px] text-gray-800 bg-white border-[1.5px] rounded-sm outline-none transition-[border-color,box-shadow] placeholder:text-gray-400 ${
    err
      ? 'border-red-400 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,.1)]'
      : 'border-gray-200 focus:border-primary focus:shadow-[0_0_0_3px_rgba(29,158,117,.1)]'
  }`
