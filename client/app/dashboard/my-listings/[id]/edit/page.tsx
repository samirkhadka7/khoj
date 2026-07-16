'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { FormProvider, useForm } from 'react-hook-form'
import { ArrowLeft, Lock, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/axios'
import { useDashboardUser } from '@/components/dashboard/DashboardContext'
import { EditStepper } from '@/components/edit-listing/EditStepper'
import { PhotoManager } from '@/components/edit-listing/PhotoManager'
import { Step2Basics } from '@/components/new-listing/Step2Basics'
import { Step3TypeFields } from '@/components/new-listing/Step3TypeFields'
import { Step4Amenities } from '@/components/new-listing/Step4Amenities'
import {
  BusinessFieldsSchema,
  DEFAULT_FORM,
  HostelFieldsSchema,
  NewListingSchema,
  OfficeFieldsSchema,
  RoomFieldsSchema,
  type NewListingForm,
} from '@/components/new-listing/schema'
import type { ApiResponse, Listing, ListingType } from '@/types'

const TYPE_FIELDS_SCHEMA = {
  hostel: HostelFieldsSchema,
  room: RoomFieldsSchema,
  office: OfficeFieldsSchema,
  business: BusinessFieldsSchema,
} as const

const TYPE_LABEL: Record<ListingType, string> = {
  hostel: 'Hostel',
  room: 'Room / Flat',
  office: 'Office Space',
  business: 'Business Space',
}

const TYPE_EMOJI: Record<ListingType, string> = {
  hostel: '🏠',
  room: '🛏️',
  office: '💼',
  business: '🏪',
}

/**
 * 3-step edit form. Reuses Step2Basics / Step3TypeFields / Step4Amenities
 * from the new-listing flow — same shape, same validation, same components.
 *
 * Differences from the new-listing flow:
 *   - Listing type is locked (shown as a banner above the stepper)
 *   - Photos managed independently via PhotoManager (add/remove hit the API
 *     instantly, not bundled with the form submit)
 *   - Final submit sends JSON (not multipart) to PUT /api/listings/:id
 */
export default function EditListingPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const listingId = params.id
  const { user } = useDashboardUser()

  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [forbidden, setForbidden] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [submitting, setSubmitting] = useState(false)
  const [images, setImages] = useState<string[]>([])

  const form = useForm<NewListingForm>({
    defaultValues: DEFAULT_FORM,
    mode: 'onChange',
  })

  /* ---- Fetch listing and seed the form ---- */
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await api.get<ApiResponse<Listing>>(`/api/listings/${listingId}`)
        if (cancelled) return
        if (!data.success || !data.data) {
          setNotFound(true)
          return
        }
        const l = data.data

        // Ownership gate — admin can edit anyone's listing, owner only their own
        const ownerId = typeof l.ownerId === 'object' ? l.ownerId._id : l.ownerId
        if (user.role !== 'admin' && ownerId !== user._id) {
          setForbidden(true)
          return
        }

        setListing(l)
        setImages(l.images || [])

        // Reset RHF defaults from the fetched listing — coordinates is GeoJSON [lng, lat]
        form.reset({
          type: l.type,
          title: l.title,
          description: l.description,
          price: l.price,
          negotiable: l.negotiable,
          address: l.location.address,
          area: l.location.area,
          district: l.location.district,
          lat: l.location.coordinates.coordinates[1],
          lng: l.location.coordinates.coordinates[0],
          amenities: l.amenities || [],
          typeFields: l.typeFields,
          photos: [],
          isAvailable: l.isAvailable,
        })
      } catch (err: unknown) {
        if (cancelled) return
        const e = err as { response?: { status?: number } }
        if (e.response?.status === 404) setNotFound(true)
        else toast.error('Could not load listing')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId])

  const goNext = async (fieldsToValidate?: Array<keyof NewListingForm>) => {
    if (fieldsToValidate?.length) {
      const ok = await form.trigger(fieldsToValidate as never)
      if (!ok) {
        toast.error('Please fix the errors before continuing')
        return
      }
    }
    setStep((s) => (Math.min(3, s + 1) as 1 | 2 | 3))
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goBack = () => {
    setStep((s) => (Math.max(1, s - 1) as 1 | 2 | 3))
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleStep2Next = useMemo(
    () => () => {
      const values = form.getValues()
      const subSchema = TYPE_FIELDS_SCHEMA[values.type]
      const result = subSchema.safeParse(values.typeFields)
      if (!result.success) {
        const first = result.error.issues[0]
        toast.error(
          first ? `${first.path.join('.')}: ${first.message}` : 'Please complete all required fields'
        )
        return
      }
      form.setValue('typeFields', result.data, { shouldDirty: true })
      setStep(3)
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [form]
  )

  const handleSubmit = async () => {
    const values = form.getValues()

    const base = NewListingSchema.safeParse(values)
    if (!base.success) {
      const first = base.error.issues[0]
      toast.error(first ? `${first.path.join('.')}: ${first.message}` : 'Form has errors')
      return
    }

    const subSchema = TYPE_FIELDS_SCHEMA[values.type]
    const tfResult = subSchema.safeParse(values.typeFields)
    if (!tfResult.success) {
      toast.error('Type-specific details are incomplete — go back to step 2')
      return
    }

    setSubmitting(true)
    try {
      // Backend PUT accepts JSON for text fields. Images are managed separately
      // by PhotoManager and are NOT included in this payload.
      await api.put(`/api/listings/${listingId}`, {
        title: values.title,
        description: values.description,
        price: values.price,
        negotiable: values.negotiable,
        address: values.address,
        area: values.area,
        district: values.district,
        lat: values.lat,
        lng: values.lng,
        amenities: values.amenities,
        typeFields: tfResult.data,
        isAvailable: values.isAvailable,
      })
      toast.success('Listing updated')
      router.push('/dashboard/my-listings')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      toast.error(e.response?.data?.message || e.message || 'Could not save changes')
    } finally {
      setSubmitting(false)
    }
  }

  /* -------------------------------------------------------------------------- */
  /*  Render states                                                              */
  /* -------------------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex justify-center">
        <Loader2 size={28} className="text-gray-400 animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <ErrorState
        title="Listing not found"
        message="This listing may have been removed."
        ctaHref="/dashboard/my-listings"
        ctaLabel="Back to my listings"
      />
    )
  }

  if (forbidden) {
    return (
      <ErrorState
        title="Not your listing"
        message="You can only edit listings you own."
        ctaHref="/dashboard/my-listings"
        ctaLabel="Back to my listings"
      />
    )
  }

  if (!listing) return null

  return (
    <FormProvider {...form}>
      <div className="min-h-screen bg-offWhite pb-12">
        {/* Page header — back link, title, locked-type banner */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-5">
          <div className="max-w-[800px] mx-auto">
            <Link
              href="/dashboard/my-listings"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-600 hover:text-primary transition-colors mb-3"
            >
              <ArrowLeft size={14} />
              Back to my listings
            </Link>
            <h1 className="font-display font-extrabold text-[24px] text-gray-800 tracking-[-0.4px]">
              Edit listing
            </h1>
            <p className="text-[13.5px] text-gray-600 mt-0.5 truncate max-w-[640px]">
              {listing.title}
            </p>

            {/* Locked-type banner */}
            <div className="mt-4 flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-sm px-4 py-3">
              <div className="w-10 h-10 rounded-md bg-white flex items-center justify-center text-[20px] flex-shrink-0">
                {TYPE_EMOJI[listing.type]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.6px]">
                  Listing type
                </div>
                <div className="font-display font-bold text-[14px] text-gray-800 flex items-center gap-1.5">
                  {TYPE_LABEL[listing.type]}
                  <Lock size={11} className="text-gray-400" />
                </div>
              </div>
              <span className="text-[11px] text-gray-400 hidden sm:inline">
                Type cannot be changed after creation
              </span>
            </div>
          </div>
        </div>

        {/* Photo manager — independent, saves on click */}
        <div className="max-w-[800px] mx-auto px-6 mt-6">
          <PhotoManager
            listingId={listingId}
            images={images}
            onChange={setImages}
          />
        </div>

        {/* Stepper + step body */}
        <div className="mt-6">
          <EditStepper currentStep={step} />

          {step === 1 && (
            <Step2Basics
              onBack={() => router.push('/dashboard/my-listings')}
              onNext={() =>
                goNext([
                  'title',
                  'description',
                  'price',
                  'address',
                  'area',
                  'district',
                  'lat',
                  'lng',
                ])
              }
            />
          )}

          {step === 2 && <Step3TypeFields onBack={goBack} onNext={handleStep2Next} />}

          {step === 3 && (
            <div>
              <Step4Amenities onBack={goBack} onNext={handleSubmit} />
              {submitting && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
                  <div className="bg-white rounded-md px-5 py-4 flex items-center gap-3 shadow-lg">
                    <Loader2 size={18} className="animate-spin text-primary" />
                    <span className="text-[14px] font-semibold text-gray-800">
                      Saving changes...
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </FormProvider>
  )
}

/* -------------------------------------------------------------------------- */

function ErrorState({
  title,
  message,
  ctaHref,
  ctaLabel,
}: {
  title: string
  message: string
  ctaHref: string
  ctaLabel: string
}) {
  return (
    <div className="px-8 py-12">
      <div className="bg-white border border-gray-100 rounded-lg p-10 text-center max-w-[440px] mx-auto">
        <h1 className="font-display font-bold text-[20px] text-gray-800 mb-2">{title}</h1>
        <p className="text-[14px] text-gray-600 mb-5">{message}</p>
        <Link
          href={ctaHref}
          className="inline-block h-10 px-5 bg-primary text-white rounded-sm font-semibold text-[14px] hover:bg-dark transition-colors leading-[40px]"
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  )
}
