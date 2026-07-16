'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '@/lib/axios'
import { useDashboardUser } from '@/components/dashboard/DashboardContext'
import { Stepper } from '@/components/new-listing/Stepper'
import { Step1Type } from '@/components/new-listing/Step1Type'
import { Step2Basics } from '@/components/new-listing/Step2Basics'
import { Step3TypeFields } from '@/components/new-listing/Step3TypeFields'
import { Step4Amenities } from '@/components/new-listing/Step4Amenities'
import { Step5Photos } from '@/components/new-listing/Step5Photos'
import {
  BusinessFieldsSchema,
  DEFAULT_FORM,
  HostelFieldsSchema,
  NewListingSchema,
  OfficeFieldsSchema,
  RoomFieldsSchema,
  type NewListingForm,
} from '@/components/new-listing/schema'

const TYPE_FIELDS_SCHEMA = {
  hostel: HostelFieldsSchema,
  room: RoomFieldsSchema,
  office: OfficeFieldsSchema,
  business: BusinessFieldsSchema,
} as const

/**
 * 5-step "Create New Listing" form for owners.
 *
 * Validation strategy:
 *   - One single useForm with all fields, defaults seeded from DEFAULT_FORM.
 *   - Each "Next" click runs `trigger([...stepFields])` for incremental validation.
 *   - Final submit re-runs the full Zod schema PLUS the type-specific subschema.
 *   - Submission posts multipart/form-data to POST /api/listings, including
 *     up to 10 image files. Backend uploads to Cloudinary.
 */
export default function NewListingPage() {
  const router = useRouter()
  const { user } = useDashboardUser()
  const isOwner = user.role === 'owner' || user.role === 'admin'

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<NewListingForm>({
    defaultValues: DEFAULT_FORM,
    mode: 'onChange',
  })

  if (!isOwner) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="bg-white border border-gray-100 rounded-lg p-10 text-center max-w-[480px] mx-auto">
          <h1 className="font-display font-bold text-[20px] text-gray-800 mb-2">
            Owner-only area
          </h1>
          <p className="text-[14px] text-gray-600 mb-5">
            Switch to an owner account to list a property.
          </p>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="h-10 px-5 bg-primary text-white rounded-sm font-semibold text-[14px] hover:bg-dark transition-colors"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  const goNext = async (fieldsToValidate?: Array<keyof NewListingForm>) => {
    if (fieldsToValidate && fieldsToValidate.length > 0) {
      const ok = await form.trigger(fieldsToValidate as never)
      if (!ok) {
        toast.error('Please fix the errors before continuing')
        return
      }
    }
    setStep((s) => (Math.min(5, s + 1) as 1 | 2 | 3 | 4 | 5))
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goBack = () => {
    setStep((s) => (Math.max(1, s - 1) as 1 | 2 | 3 | 4 | 5))
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleStep3Next = () => {
    // Validate type-specific subschema before letting the user move on
    const values = form.getValues()
    const subSchema = TYPE_FIELDS_SCHEMA[values.type]
    const result = subSchema.safeParse(values.typeFields)
    if (!result.success) {
      const first = result.error.issues[0]
      toast.error(first ? `${first.path.join('.')}: ${first.message}` : 'Please complete all required fields')
      return
    }
    // Persist the parsed (coerced) value back into the form
    form.setValue('typeFields', result.data, { shouldDirty: true })
    setStep(4)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    const values = form.getValues()

    // 1. Validate base shape
    const base = NewListingSchema.safeParse(values)
    if (!base.success) {
      const first = base.error.issues[0]
      toast.error(first ? `${first.path.join('.')}: ${first.message}` : 'Form has errors')
      return
    }

    // 2. Validate type-specific subschema (defense in depth — already ran on Step 3)
    const subSchema = TYPE_FIELDS_SCHEMA[values.type]
    const tfResult = subSchema.safeParse(values.typeFields)
    if (!tfResult.success) {
      toast.error('Type-specific details are incomplete — go back to step 3')
      return
    }

    // 3. Build multipart/form-data — backend expects flat fields + JSON typeFields blob
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('type', values.type)
      fd.append('title', values.title)
      fd.append('description', values.description)
      fd.append('price', String(values.price))
      fd.append('negotiable', String(values.negotiable))
      fd.append('address', values.address)
      fd.append('area', values.area)
      fd.append('district', values.district)
      fd.append('lat', String(values.lat))
      fd.append('lng', String(values.lng))
      fd.append('amenities', values.amenities.join(','))
      fd.append('typeFields', JSON.stringify(tfResult.data))
      values.photos.forEach((file) => fd.append('images', file))

      // axios sets multipart Content-Type with boundary automatically when given FormData
      await api.post('/api/listings', fd)

      toast.success('Listing published! Admin will verify within 24 hours.')
      router.push('/dashboard/my-listings')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      toast.error(e.response?.data?.message || e.message || 'Failed to publish listing')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormProvider {...form}>
      <div className="min-h-screen bg-offWhite">
        <Stepper currentStep={step} />

        {step === 1 && (
          <Step1Type onNext={() => setStep(2)} />
        )}

        {step === 2 && (
          <Step2Basics
            onBack={goBack}
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

        {step === 3 && <Step3TypeFields onBack={goBack} onNext={handleStep3Next} />}

        {step === 4 && <Step4Amenities onBack={goBack} onNext={() => setStep(5)} />}

        {step === 5 && (
          <Step5Photos onBack={goBack} onSubmit={handleSubmit} submitting={submitting} />
        )}
      </div>
    </FormProvider>
  )
}
