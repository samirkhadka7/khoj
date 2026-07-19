'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  BadgeCheck,
  Camera,
  CheckCircle2,
  Download,
  Headphones,
  Loader2,
  Lock,
  Mail,
  Save,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/axios'
import { useDashboardUser } from '@/components/dashboard/DashboardContext'
import type { ApiResponse, User } from '@/types'

interface PersonalFormValues {
  name: string
  bio: string
  phone: string
}

const PHONE_REGEX = /^9\d{9}$/

export default function ProfilePage() {
  const { user, refresh } = useDashboardUser()
  const fileRef = useRef<HTMLInputElement>(null)
  const [photoUploading, setPhotoUploading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PersonalFormValues>({
    mode: 'onChange',
    defaultValues: { name: user.name, bio: user.bio || '', phone: user.phone || '' },
  })

  useEffect(() => {
    reset({ name: user.name, bio: user.bio || '', phone: user.phone || '' })
  }, [user, reset])

  const bio = watch('bio') || ''

  const onSavePersonal = async (values: PersonalFormValues) => {
    try {
      const payload = {
        name: values.name.trim(),
        bio: values.bio.trim(),
        phone: values.phone.trim(),
      }
      const { data } = await api.put<ApiResponse<User>>('/api/auth/profile', payload)
      if (!data.success || !data.data) {
        toast.error(data.message || 'Could not save profile')
        return
      }
      toast.success('Profile updated')
      await refresh()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      toast.error(e.response?.data?.message || e.message || 'Save failed')
    }
  }

  const onPickPhoto = () => fileRef.current?.click()

  const onPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be under 5 MB')
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image')
      return
    }
    setPhotoUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const { data } = await api.put<ApiResponse<User>>('/api/auth/profile-photo', fd)
      if (!data.success) {
        toast.error(data.message || 'Upload failed')
        return
      }
      toast.success('Photo updated')
      await refresh()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      toast.error(e.response?.data?.message || e.message || 'Upload failed')
    } finally {
      setPhotoUploading(false)
    }
  }

  const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
  const isOwner = user.role === 'owner' || user.role === 'admin'

  return (
    <div className="px-6 lg:px-8 py-8 max-w-[1100px]">
      <h1 className="text-[28px] font-extrabold text-dark tracking-tight mb-1">Profile Settings</h1>
      <p className="text-[14px] text-gray-500 mb-7">
        Manage your account details and security preferences.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <form
            onSubmit={handleSubmit(onSavePersonal)}
            className="bg-white border border-gray-200/70 rounded-2xl p-6 sm:p-7 shadow-card"
          >
            <SectionHeader
              icon={<BadgeCheck size={18} className="text-primary" strokeWidth={2.2} />}
              title="Basic Information"
              subtitle="Visible to others on contact requests and reviews."
            />

            <div className="space-y-4 mt-5">
              <Field label="Full Name" required error={errors.name?.message}>
                <input
                  type="text"
                  autoComplete="name"
                  {...register('name', {
                    required: 'Name is required',
                    minLength: { value: 2, message: 'Name is too short' },
                  })}
                  className={inputCls(!!errors.name)}
                />
              </Field>

              <div className="grid sm:grid-cols-2 grid-cols-1 gap-4">
                <Field label="Email Address">
                  <div className="relative flex items-center">
                    <Mail size={15} className="absolute left-3.5 text-gray-400" />
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className={`${inputCls(false)} pl-10 bg-gray-50 text-gray-500 cursor-not-allowed`}
                    />
                  </div>
                </Field>

                <Field
                  label="Phone Number"
                  error={errors.phone?.message}
                  hint="10-digit, starts with 9"
                >
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-[13.5px] font-semibold text-gray-400">
                      +977
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="9812345678"
                      {...register('phone', {
                        validate: (v) =>
                          !v ||
                          PHONE_REGEX.test(v) ||
                          'Must be a 10-digit Nepali number starting with 9',
                      })}
                      className={`${inputCls(!!errors.phone)} pl-14`}
                    />
                  </div>
                </Field>
              </div>

              <Field label="Bio" error={errors.bio?.message} hint={`${bio.length}/500`}>
                <textarea
                  rows={3}
                  placeholder="Tell others a bit about yourself…"
                  maxLength={500}
                  {...register('bio', { maxLength: { value: 500, message: 'Max 500 characters' } })}
                  className={`${inputCls(!!errors.bio)} resize-none py-3 leading-relaxed`}
                />
              </Field>
            </div>

            <div className="flex justify-end mt-5 pt-5 border-t border-gray-100">
              <button
                type="submit"
                disabled={isSubmitting || !isDirty}
                className="inline-flex items-center gap-2 h-10 px-5 bg-primary text-white border-none rounded-lg text-[13.5px] font-bold hover:bg-dark hover:-translate-y-px transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:translate-y-0"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={13} strokeWidth={2.5} />
                    Save changes
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security */}
          <div className="bg-white border border-gray-200/70 rounded-2xl p-6 sm:p-7 shadow-card">
            <SectionHeader
              icon={<Lock size={18} className="text-primary" strokeWidth={2.2} />}
              title="Security"
              subtitle="Keep your account secure."
            />
            <div className="space-y-3 mt-5">
              <SettingRow
                label="Password"
                description="Last changed when you registered"
                actionLabel="Change"
                onClick={() => toast('Password change coming soon')}
              />
              <SettingRow
                label="Phone OTP verification"
                description={
                  user.isPhoneVerified
                    ? 'Phone verified via SMS'
                    : 'Verify your phone with a one-time code'
                }
                actionLabel={user.isPhoneVerified ? 'Verified' : 'Verify'}
                actionDisabled={user.isPhoneVerified}
                onClick={() => toast('Phone OTP via Sparrow SMS coming soon')}
              />
            </div>
          </div>

          {/* Danger zone */}
          <div className="bg-white border border-red-100 rounded-2xl p-6 sm:p-7">
            <SectionHeader
              icon={<span className="text-red-500 text-[16px]">⚠</span>}
              title="Danger zone"
              subtitle="Permanent actions. Be careful."
            />
            <button
              type="button"
              onClick={() => toast('Account deletion coming soon')}
              className="mt-5 h-10 px-5 bg-white border-[1.5px] border-red-200 rounded-lg font-semibold text-[13.5px] text-red-600 hover:bg-red-50 hover:border-red-400 transition-colors"
            >
              Delete account
            </button>
          </div>
        </div>

        {/* RIGHT — verification status sidebar */}
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-6 space-y-6">
            {/* Status card */}
            <div className="bg-dark rounded-2xl p-6 text-white">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center text-[28px] font-extrabold overflow-hidden">
                    {user.profilePhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.profilePhoto}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      user.name?.[0]?.toUpperCase() || 'U'
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={onPhotoChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={onPickPhoto}
                    disabled={photoUploading}
                    aria-label="Change photo"
                    className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-md hover:bg-primary-light transition-colors disabled:opacity-60"
                  >
                    {photoUploading ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Camera size={13} strokeWidth={2.5} />
                    )}
                  </button>
                </div>

                <h3 className="text-[18px] font-bold mt-4">{user.name}</h3>
                <span
                  className={`mt-2 inline-flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                    user.isVerified
                      ? 'bg-primary/20 text-brand-fg'
                      : 'bg-white/10 text-white/60'
                  }`}
                >
                  <CheckCircle2 size={12} strokeWidth={2.5} />
                  {user.isVerified ? 'Verified Account' : 'Standard Account'}
                </span>
              </div>

              {/* Verified perks — owners only */}
              {isOwner && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-white/50 mb-3">
                    Verified Perks
                  </p>
                  <ul className="space-y-3 list-none">
                    <Perk icon={<TrendingUp size={15} />} text="3× higher response rate from tenants" />
                    <Perk icon={<ShieldCheck size={15} />} text="Priority 'Verified' listing placement" />
                    <Perk icon={<Headphones size={15} />} text="24/7 dedicated owner support" />
                  </ul>
                  <button
                    type="button"
                    onClick={() => toast('Certificate download coming soon')}
                    className="mt-5 w-full flex items-center justify-center gap-2 h-10 bg-white/10 hover:bg-white/15 rounded-lg text-[13px] font-semibold transition-colors"
                  >
                    <Download size={14} />
                    Download Certificate
                  </button>
                </div>
              )}

              {/* Become owner CTA — non-owners */}
              {!isOwner && (
                <div className="mt-6 pt-6 border-t border-white/10 text-center">
                  <p className="text-[13px] text-white/70 mb-3 leading-relaxed">
                    Want to list properties? Become a verified owner.
                  </p>
                  <Link
                    href="/dashboard/become-owner"
                    className="inline-flex items-center justify-center gap-2 h-10 px-5 bg-primary hover:bg-primary-light rounded-lg text-[13px] font-bold transition-colors no-underline"
                  >
                    Apply for Owner Access
                  </Link>
                </div>
              )}
            </div>

            {/* Verification details */}
            <div className="bg-white border border-gray-200/70 rounded-2xl p-6 shadow-card">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-4">
                Verification Details
              </p>
              <ul className="space-y-3.5 list-none">
                <VerifyRow label="Email Verified" done />
                <VerifyRow label="Phone Verified" done={user.isPhoneVerified} />
                <VerifyRow label="Identity (KYC)" done={user.isVerified} />
              </ul>
              <p className="text-[12px] text-gray-400 mt-5 pt-4 border-t border-gray-100">
                Member since {memberSince}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-8 h-8 rounded-lg bg-primary-subtle flex items-center justify-center">
          {icon}
        </span>
        <h2 className="text-[16px] font-bold text-dark tracking-tight">{title}</h2>
      </div>
      <p className="text-[12.5px] text-gray-400 ml-10">{subtitle}</p>
    </div>
  )
}

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
  `w-full h-11 px-3.5 font-body text-[14.5px] text-gray-800 bg-white border-[1.5px] rounded-lg outline-none transition-[border-color,box-shadow] placeholder:text-gray-400 ${
    err
      ? 'border-red-400 focus:border-red-500'
      : 'border-gray-200 focus:border-primary focus:shadow-[0_0_0_3px_rgba(6,78,59,.1)]'
  }`

function SettingRow({
  label,
  description,
  actionLabel,
  actionDisabled,
  onClick,
}: {
  label: string
  description: string
  actionLabel: string
  actionDisabled?: boolean
  onClick: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-100 last:border-b-0">
      <div className="min-w-0">
        <div className="text-[13.5px] font-semibold text-gray-800">{label}</div>
        <div className="text-[12px] text-gray-400 mt-0.5">{description}</div>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={actionDisabled}
        className="h-9 px-4 bg-white border-[1.5px] border-gray-200 rounded-lg font-semibold text-[13px] text-gray-800 hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
      >
        {actionLabel}
      </button>
    </div>
  )
}

function Perk({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-3 text-[13px] text-white/85">
      <span className="text-brand-fg flex-shrink-0">{icon}</span>
      {text}
    </li>
  )
}

function VerifyRow({ label, done }: { label: string; done: boolean }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-[13.5px] text-gray-700">{label}</span>
      {done ? (
        <span className="flex items-center gap-1 text-[12px] font-bold text-primary">
          <CheckCircle2 size={15} strokeWidth={2.5} />
          Verified
        </span>
      ) : (
        <span className="text-[12px] font-semibold text-gray-300">Pending</span>
      )}
    </li>
  )
}
