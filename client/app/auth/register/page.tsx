'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Mail, Lock, User as UserIcon, Eye, EyeOff, Phone, UserPlus, Loader2 } from 'lucide-react'

import api, { TOKEN_KEY } from '@/lib/axios'
import { AuthShell } from '@/components/auth/AuthShell'
import { GoogleButton } from '@/components/auth/GoogleButton'
import type { ApiResponse, RegisterDTO, User } from '@/types'

interface RegisterFormValues {
  name: string
  email: string
  password: string
  phone: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^9\d{9}$/

export default function RegisterPage() {
  const router = useRouter()
  const [showPw, setShowPw] = useState(false)

  const {
    register: field,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<RegisterFormValues>({ mode: 'onChange' })

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      const payload: RegisterDTO = {
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        phone: values.phone.trim(),
      }
      const { data } = await api.post<ApiResponse<{ token: string; user: User }>>(
        '/api/auth/register',
        payload
      )
      if (!data.success || !data.data) {
        toast.error(data.message || 'Unable to create account.')
        return
      }
      localStorage.setItem(TOKEN_KEY, data.data.token)
      toast.success(`Welcome to BaasKhoj, ${data.data.user.name.split(' ')[0]}!`)
      router.push('/dashboard')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      toast.error(e.response?.data?.message || e.message || 'Registration failed.')
    }
  }

  const submitDisabled = isSubmitting || !isValid

  return (
    <AuthShell
      heading="Create your account"
      subheading="Join BaasKhoj — find verified spaces or list your own."
      footer={
        <div className="flex items-center justify-center gap-0 mt-[22px] pt-[18px] border-t border-gray-100 flex-wrap">
          {['Free to start', 'No middlemen', 'Verified listings'].map((label, i, arr) => (
            <div
              key={label}
              className={`flex items-center gap-1.5 text-[11.5px] text-gray-400 font-medium px-3 ${
                i !== arr.length - 1 ? 'border-r border-gray-200' : ''
              }`}
            >
              <span className="w-[5px] h-[5px] rounded-full bg-primary" />
              {label}
            </div>
          ))}
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Full Name */}
        <div className="mb-[14px]">
          <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-[.6px] mb-[7px]">
            Full Name
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-[13px] text-gray-400 pointer-events-none flex items-center">
              <UserIcon size={15} strokeWidth={2} />
            </span>
            <input
              type="text"
              autoComplete="name"
              placeholder="Anjali Singh"
              {...field('name', {
                required: 'Name is required',
                minLength: { value: 2, message: 'Name is too short' },
              })}
              className={inputCls(!!errors.name)}
            />
          </div>
          {errors.name && <p className="mt-1 text-[12px] text-red-600">{errors.name.message}</p>}
        </div>

        {/* Email */}
        <div className="mb-[14px]">
          <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-[.6px] mb-[7px]">
            Email Address
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-[13px] text-gray-400 pointer-events-none flex items-center">
              <Mail size={15} strokeWidth={2} />
            </span>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...field('email', {
                required: 'Email is required',
                pattern: { value: EMAIL_REGEX, message: 'Enter a valid email address' },
              })}
              className={inputCls(!!errors.email)}
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-[12px] text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="mb-[14px]">
          <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-[.6px] mb-[7px]">
            Password
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-[13px] text-gray-400 pointer-events-none flex items-center">
              <Lock size={15} strokeWidth={2} />
            </span>
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              {...field('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' },
              })}
              className={`${inputCls(!!errors.password)} pl-10 pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 bg-transparent border-none cursor-pointer text-gray-400 p-1 transition-colors hover:text-primary"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-[12px] text-red-600">{errors.password.message}</p>
          )}
        </div>

        {/* Phone with +977 prefix */}
        <div className="mb-[18px]">
          <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-[.6px] mb-[7px]">
            Phone Number
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-[13px] text-gray-400 pointer-events-none flex items-center gap-1">
              <Phone size={15} strokeWidth={2} />
              <span className="text-[13.5px] font-semibold ml-0.5">+977</span>
            </span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={10}
              placeholder="9812345678"
              {...field('phone', {
                required: 'Phone is required',
                pattern: { value: PHONE_REGEX, message: '10-digit Nepali number starting with 9' },
              })}
              className={`${inputCls(!!errors.phone)} pl-[78px]`}
            />
          </div>
          {errors.phone && <p className="mt-1 text-[12px] text-red-600">{errors.phone.message}</p>}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitDisabled}
          className="w-full h-[46px] bg-primary text-white border-none rounded-sm font-display text-[15px] font-bold cursor-pointer tracking-[-0.1px] flex items-center justify-center gap-2 transition-[background,transform,box-shadow] duration-150 hover:bg-dark hover:-translate-y-px hover:shadow-[0_8px_28px_rgba(29,158,117,.22)] active:translate-y-0 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 disabled:hover:bg-gray-300"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              <UserPlus size={15} strokeWidth={2.5} />
              Create Account
            </>
          )}
        </button>

        {/* Want to list properties? */}
        <p className="text-[11.5px] text-gray-400 text-center mt-3 leading-[1.5]">
          Want to list properties? You&apos;ll be able to apply for verified-owner access from your
          dashboard after signing up.
        </p>

        {/* Divider */}
        <div className="flex items-center gap-3 my-[18px]">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-[12px] text-gray-400 font-medium whitespace-nowrap">
            or continue with
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <GoogleButton />

        {/* Switch */}
        <div className="text-center mt-[18px] text-[13.5px] text-gray-400">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="text-primary font-bold no-underline transition-colors hover:text-dark"
          >
            Login
          </Link>
        </div>

        <p className="text-[11.5px] text-gray-400 text-center mt-3 leading-[1.5]">
          By signing up, you agree to our{' '}
          <Link href="/terms" className="text-gray-600 hover:text-primary">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-gray-600 hover:text-primary">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </AuthShell>
  )
}

const inputCls = (err: boolean) =>
  `w-full h-11 pl-10 pr-3.5 font-body text-[14.5px] text-gray-800 bg-white border-[1.5px] rounded-sm outline-none transition-[border-color,box-shadow] placeholder:text-gray-400 ${
    err
      ? 'border-red-400 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,.1)]'
      : 'border-gray-200 focus:border-primary focus:shadow-[0_0_0_3px_rgba(29,158,117,.1)]'
  }`
