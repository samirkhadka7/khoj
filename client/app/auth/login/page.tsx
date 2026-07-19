'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { Mail, Lock, Eye, EyeOff, LogIn, Loader2 } from 'lucide-react'

import api, { setAccessToken } from '@/lib/axios'
import { AuthShell } from '@/components/auth/AuthShell'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { MfaStep } from '@/components/auth/MfaStep'
import { ResetPasswordStep } from '@/components/auth/ResetPasswordStep'
import type { AuthResult } from '@/components/auth/authResult'
import type { ApiResponse, LoginDTO, User } from '@/types'

interface LoginFormValues {
  email: string
  password: string
}

type Step = 'credentials' | 'mfa' | 'reset'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Dev falls back to hCaptcha's always-pass TEST sitekey; prod sets the real one.
const HCAPTCHA_SITEKEY =
  process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY || '10000000-ffff-ffff-ffff-000000000001'

const HEADINGS: Record<Step, { heading: string; subheading: string }> = {
  credentials: { heading: 'Welcome back!', subheading: 'Sign in to find your perfect space in Nepal.' },
  mfa: { heading: 'Two-factor verification', subheading: 'Enter the code from your authenticator app.' },
  reset: { heading: 'Update your password', subheading: 'Your password has expired and must be changed.' },
}

export default function LoginPage() {
  const router = useRouter()
  const [showPw, setShowPw] = useState(false)
  const [step, setStep] = useState<Step>('credentials')
  // Challenge tokens are kept in memory only (component state), never persisted —
  // consistent with the Feature 5 access-token model.
  const [mfaToken, setMfaToken] = useState<string | null>(null)
  const [resetToken, setResetToken] = useState<string | null>(null)

  // The widget appears only after the server says a CAPTCHA is required (i.e. once
  // this IP has crossed the failed-attempt threshold) — not on every attempt.
  const [captchaRequired, setCaptchaRequired] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const captchaRef = useRef<HCaptcha>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<LoginFormValues>({ mode: 'onChange' })

  const finishLogin = (user: User, token: string) => {
    // Access token lives in memory only; the refresh cookie was set by the server.
    setAccessToken(token)
    toast.success(`Welcome back, ${user.name.split(' ')[0]}!`)
    // Admins land on the admin console; everyone else on the user dashboard.
    router.push(user.role === 'admin' ? '/admin' : '/dashboard')
  }

  /**
   * Route an auth response to the next state: a full session ends the flow; an MFA
   * challenge or an expired password advances to that step. Shared by every step so
   * e.g. the MFA step can itself surface passwordExpired. Returns true if handled.
   */
  const routeResult = (d: AuthResult): boolean => {
    if (d.token && d.user) {
      finishLogin(d.user, d.token)
      return true
    }
    if (d.mfaRequired && d.mfaToken) {
      setMfaToken(d.mfaToken)
      setStep('mfa')
      return true
    }
    if (d.passwordExpired && d.resetToken) {
      setResetToken(d.resetToken)
      setStep('reset')
      return true
    }
    return false
  }

  const onSubmit = async (values: LoginFormValues) => {
    if (captchaRequired && !captchaToken) {
      toast.error('Please complete the CAPTCHA.')
      return
    }
    try {
      const { data } = await api.post<ApiResponse<AuthResult>>('/api/auth/login', {
        ...(values satisfies LoginDTO),
        ...(captchaRequired ? { captchaToken } : {}),
      })
      if (data.success && data.data && routeResult(data.data)) return
      toast.error(data.message || 'Unable to sign in. Please try again.')
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { message?: string; captchaRequired?: boolean } }
        message?: string
      }
      // Once the server flags captchaRequired, show the widget and reset any spent token.
      if (e.response?.data?.captchaRequired) {
        setCaptchaRequired(true)
        setCaptchaToken(null)
        captchaRef.current?.resetCaptcha()
      }
      toast.error(
        e.response?.data?.message || e.message || 'Login failed. Please check your credentials.',
      )
    }
  }

  const submitDisabled = isSubmitting || !isValid || (captchaRequired && !captchaToken)
  const { heading, subheading } = HEADINGS[step]

  return (
    <AuthShell
      heading={heading}
      subheading={subheading}
      footer={
        step === 'credentials' ? (
          <div className="flex items-center justify-center gap-0 mt-[22px] pt-[18px] border-t border-gray-100 flex-wrap">
            {['Verified listings', 'Safe contact system', "Nepal's #1"].map((label, i, arr) => (
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
        ) : undefined
      }
    >
      {step === 'mfa' && mfaToken && (
        <MfaStep mfaToken={mfaToken} onResult={routeResult} onCancel={() => setStep('credentials')} />
      )}

      {step === 'reset' && resetToken && (
        <ResetPasswordStep resetToken={resetToken} onResult={routeResult} />
      )}

      {step === 'credentials' && (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
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
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: EMAIL_REGEX, message: 'Enter a valid email address' },
                })}
                className="w-full h-11 pl-10 pr-3.5 font-body text-[14.5px] text-gray-800 bg-white border-[1.5px] border-gray-200 rounded-sm outline-none transition-[border-color,box-shadow] placeholder:text-gray-400 focus:border-primary focus:shadow-[0_0_0_3px_rgba(29,158,117,.1)]"
              />
            </div>
            {errors.email && <p className="mt-1 text-[12px] text-red-600">{errors.email.message}</p>}
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
                autoComplete="current-password"
                placeholder="Enter your password"
                {...register('password', { required: 'Password is required' })}
                className="w-full h-11 pl-10 pr-11 font-body text-[14.5px] text-gray-800 bg-white border-[1.5px] border-gray-200 rounded-sm outline-none transition-[border-color,box-shadow] placeholder:text-gray-400 focus:border-primary focus:shadow-[0_0_0_3px_rgba(29,158,117,.1)]"
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

          {/* Forgot */}
          <div className="flex justify-end -mt-1.5 mb-4">
            <Link
              href="#"
              className="text-[13px] text-primary font-medium no-underline transition-colors hover:text-dark"
            >
              Forgot password?
            </Link>
          </div>

          {/* CAPTCHA — only shown after the server flags too many failed attempts */}
          {captchaRequired && (
            <div className="mb-4 flex justify-center">
              <HCaptcha
                ref={captchaRef}
                sitekey={HCAPTCHA_SITEKEY}
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
                onError={() => setCaptchaToken(null)}
              />
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitDisabled}
            className="w-full h-[46px] bg-primary text-white border-none rounded-sm font-display text-[15px] font-bold cursor-pointer tracking-[-0.1px] flex items-center justify-center gap-2 transition-[background,transform,box-shadow] duration-150 hover:bg-dark hover:-translate-y-px hover:shadow-[0_8px_28px_rgba(29,158,117,.22)] active:translate-y-0 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 disabled:hover:bg-gray-300"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn size={15} strokeWidth={2.5} />
                Login
              </>
            )}
          </button>

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
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/register"
              className="text-primary font-bold no-underline transition-colors hover:text-dark"
            >
              Register
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  )
}
