'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/axios'
import { useDashboardUser } from '@/components/dashboard/DashboardContext'
import { KycStepper } from '@/components/kyc/KycStepper'
import { Step1PersonalInfo } from '@/components/kyc/Step1PersonalInfo'
import { Step2Documents } from '@/components/kyc/Step2Documents'
import { Step3Review } from '@/components/kyc/Step3Review'
import { BlockedState } from '@/components/kyc/BlockedState'
import { KycSidebar } from '@/components/kyc/KycSidebar'
import { PHONE_REGEX, type StepDocs, type StepInfo } from '@/components/kyc/types'
import type { ApiResponse, Kyc } from '@/types'

/**
 * 3-step KYC application form. Submits to POST /api/kyc/submit (multipart).
 *
 * State branches by existing KYC:
 *   none              → show full 3-step form
 *   status=pending    → show BlockedState ("under review")
 *   status=approved   → show BlockedState ("already verified")
 *   status=rejected   → show form with red banner explaining why; user can resubmit
 */
export default function BecomeOwnerPage() {
  const router = useRouter()
  const { user, refresh } = useDashboardUser()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [submitting, setSubmitting] = useState(false)
  const [existingKyc, setExistingKyc] = useState<Kyc | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [confirmed, setConfirmed] = useState(false)

  const [info, setInfo] = useState<StepInfo>({
    legalName: user.name || '',
    phone: user.phone || '',
    district: 'Kathmandu',
    area: '',
  })
  const [docs, setDocs] = useState<StepDocs>({
    citizenshipFront: null,
    citizenshipBack: null,
    selfieWithId: null,
  })

  // Fetch existing KYC so we know whether to show form, blocker, or rejection banner
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await api.get<ApiResponse<Kyc | null>>('/api/kyc/status')
        if (cancelled) return
        if (data.success) setExistingKyc(data.data ?? null)
      } finally {
        if (!cancelled) setStatusLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const validateStep1 = (): boolean => {
    if (!info.legalName.trim() || info.legalName.trim().length < 3) {
      toast.error('Legal name is required (min 3 characters)')
      return false
    }
    if (!PHONE_REGEX.test(info.phone.trim())) {
      toast.error('Phone must be a 10-digit Nepali number starting with 9')
      return false
    }
    if (!info.district || !info.area.trim()) {
      toast.error('District and area are both required')
      return false
    }
    return true
  }

  const validateStep2 = (): boolean => {
    if (!docs.citizenshipFront || !docs.citizenshipBack || !docs.selfieWithId) {
      toast.error('Please upload all three documents')
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!confirmed) {
      toast.error('Please confirm that the information is genuine')
      return
    }
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('legalName', info.legalName.trim())
      fd.append('phone', info.phone.trim())
      fd.append('district', info.district)
      fd.append('area', info.area.trim())
      fd.append('citizenshipFront', docs.citizenshipFront!)
      fd.append('citizenshipBack', docs.citizenshipBack!)
      fd.append('selfieWithId', docs.selfieWithId!)

      await api.post('/api/kyc/submit', fd)
      toast.success('Application submitted! Admin will review within 24-48 hours.')
      await refresh()
      router.push('/dashboard')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      toast.error(e.response?.data?.message || e.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  /* ---- Loading / blocked states ---- */

  if (statusLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex justify-center">
        <Loader2 size={28} className="text-gray-400 animate-spin" />
      </div>
    )
  }

  if (existingKyc?.status === 'approved') {
    return (
      <BlockedState
        kind="approved"
        title="You're already verified"
        message="You've been approved as an owner. You can list properties from your dashboard."
        cta={{ href: '/dashboard/my-listings/new', label: 'Add a listing' }}
      />
    )
  }

  if (existingKyc?.status === 'pending') {
    return (
      <BlockedState
        kind="pending"
        title="Application under review"
        message={`Submitted ${new Date(existingKyc.submittedAt).toLocaleString()}. Admin reviews within 24-48 hours.`}
        cta={{ href: '/dashboard', label: 'Back to dashboard' }}
      />
    )
  }

  /* ---- Form ---- */

  return (
    <div className="min-h-screen bg-offWhite pb-12">
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-5">
        <div className="max-w-[800px] mx-auto">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-600 hover:text-primary transition-colors mb-3"
          >
            <ArrowLeft size={14} />
            Back to dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-md bg-primary-subtle flex items-center justify-center text-primary flex-shrink-0">
              <ShieldCheck size={20} strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-[22px] text-gray-800 tracking-[-0.4px]">
                Become a verified owner
              </h1>
              <p className="text-[13px] text-gray-600 mt-0.5">
                Submit KYC documents — admin reviews within 24-48 hours.
              </p>
            </div>
          </div>

          {existingKyc?.status === 'rejected' && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-sm p-3">
              <div className="text-[12px] font-bold text-red-700 uppercase tracking-[0.5px] mb-0.5">
                Previous application rejected
              </div>
              <p className="text-[13px] text-red-700">
                {existingKyc.rejectionReason || 'Please resubmit with valid documents.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <KycStepper currentStep={step} />

      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-7 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* Form column */}
        <div>
          {step === 1 && (
            <Step1PersonalInfo
              info={info}
              setInfo={setInfo}
              onNext={() => {
                if (validateStep1()) setStep(2)
              }}
            />
          )}
          {step === 2 && (
            <Step2Documents
              docs={docs}
              setDocs={setDocs}
              onBack={() => setStep(1)}
              onNext={() => {
                if (validateStep2()) setStep(3)
              }}
            />
          )}
          {step === 3 && (
            <Step3Review
              info={info}
              docs={docs}
              confirmed={confirmed}
              setConfirmed={setConfirmed}
              onBack={() => setStep(2)}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          )}
        </div>

        {/* Why-verify + need-help rail */}
        <aside className="lg:pt-2">
          <KycSidebar />
        </aside>
      </div>
    </div>
  )
}
