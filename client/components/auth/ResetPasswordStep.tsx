'use client'

import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { KeyRound, Lock, Loader2 } from 'lucide-react'
import api from '@/lib/axios'
import type { ApiResponse } from '@/types'
import { PasswordStrengthMeter } from './PasswordStrengthMeter'
import type { AuthResult } from './authResult'

const INPUT_CLS =
  'w-full h-11 pl-10 pr-3.5 font-body text-[14.5px] text-gray-800 bg-white border-[1.5px] border-gray-200 rounded-sm outline-none transition-[border-color,box-shadow] placeholder:text-gray-400 focus:border-primary focus:shadow-[0_0_0_3px_rgba(29,158,117,.1)]'

interface FormValues {
  newPassword: string
  confirm: string
}

/**
 * Forced password-reset step (Feature 3 UI): login returned passwordExpired +
 * a scoped resetToken (NOT a session). We collect a policy-valid new password —
 * reusing the same strength meter + policy as register/change-password — and
 * exchange the in-memory resetToken for a session via /reset-expired-password.
 */
export function ResetPasswordStep({
  resetToken,
  onResult,
}: {
  resetToken: string
  onResult: (data: AuthResult) => boolean
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormValues>({ mode: 'onChange' })
  const newPassword = watch('newPassword') || ''

  const submit = async (values: FormValues) => {
    try {
      const { data } = await api.post<ApiResponse<AuthResult>>(
        '/api/auth/reset-expired-password',
        { resetToken, newPassword: values.newPassword },
      )
      if (data.success && data.data && onResult(data.data)) return
      toast.error(data.message || 'Could not reset password.')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast.error(e.response?.data?.message || 'Could not reset password.')
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <p className="text-[13.5px] text-gray-600 mb-4">
        Your password has expired. Set a new one to continue.
      </p>

      {/* New password */}
      <div className="mb-[14px]">
        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-[.6px] mb-[7px]">
          New password
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-[13px] text-gray-400 pointer-events-none flex items-center">
            <KeyRound size={15} strokeWidth={2} />
          </span>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="At least 12 characters"
            {...register('newPassword', {
              required: 'New password is required',
              minLength: { value: 12, message: 'Password must be at least 12 characters' },
              maxLength: { value: 128, message: 'Password must be at most 128 characters' },
              validate: (v) =>
                (/[a-z]/.test(v) && /[A-Z]/.test(v) && /[0-9]/.test(v) && /[^A-Za-z0-9]/.test(v)) ||
                'Include upper, lower, number, and a special character',
            })}
            className={INPUT_CLS}
          />
        </div>
        {errors.newPassword && (
          <p className="mt-1 text-[12px] text-red-600">{errors.newPassword.message}</p>
        )}
        <PasswordStrengthMeter password={newPassword} />
      </div>

      {/* Confirm */}
      <div className="mb-5">
        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-[.6px] mb-[7px]">
          Confirm new password
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-[13px] text-gray-400 pointer-events-none flex items-center">
            <Lock size={15} strokeWidth={2} />
          </span>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            {...register('confirm', {
              required: 'Please confirm your new password',
              validate: (v) => v === watch('newPassword') || 'Passwords do not match',
            })}
            className={INPUT_CLS}
          />
        </div>
        {errors.confirm && <p className="mt-1 text-[12px] text-red-600">{errors.confirm.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !isValid}
        className="w-full h-[46px] bg-primary text-white border-none rounded-sm font-display text-[15px] font-bold cursor-pointer flex items-center justify-center gap-2 transition-[background] hover:bg-dark disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <Loader2 size={16} strokeWidth={2.5} className="animate-spin" /> Updating...
          </>
        ) : (
          'Set new password & sign in'
        )}
      </button>
    </form>
  )
}
