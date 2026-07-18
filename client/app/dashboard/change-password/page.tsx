'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Lock, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react'

import api from '@/lib/axios'
import type { ApiResponse } from '@/types'
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter'

interface FormValues {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const inputCls =
  'w-full h-11 pl-10 pr-11 font-body text-[14.5px] text-gray-800 bg-white border-[1.5px] border-gray-200 rounded-sm outline-none transition-[border-color,box-shadow] placeholder:text-gray-400 focus:border-primary focus:shadow-[0_0_0_3px_rgba(29,158,117,.1)]'

export default function ChangePasswordPage() {
  const [show, setShow] = useState(false)
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormValues>({ mode: 'onChange' })

  const newPasswordValue = watch('newPassword') || ''

  const onSubmit = async (values: FormValues) => {
    try {
      const { data } = await api.post<ApiResponse<null>>('/api/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      if (!data.success) {
        toast.error(data.message || 'Could not change password')
        return
      }
      toast.success('Password changed. Your other devices have been signed out.')
      reset()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      toast.error(e.response?.data?.message || e.message || 'Could not change password')
    }
  }

  return (
    <div className="max-w-[520px]">
      <h1 className="font-display font-extrabold text-[22px] text-gray-800 mb-1">Change password</h1>
      <p className="text-[14px] text-gray-600 mb-6">
        Choose a strong new password. Changing it will sign out your other devices.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="bg-white border border-gray-100 rounded-lg p-6 shadow-card"
      >
        {/* Current password */}
        <div className="mb-[14px]">
          <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-[.6px] mb-[7px]">
            Current password
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-[13px] text-gray-400 pointer-events-none flex items-center">
              <Lock size={15} strokeWidth={2} />
            </span>
            <input
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your current password"
              {...register('currentPassword', { required: 'Current password is required' })}
              className={inputCls}
            />
          </div>
          {errors.currentPassword && (
            <p className="mt-1 text-[12px] text-red-600">{errors.currentPassword.message}</p>
          )}
        </div>

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
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 12 characters"
              {...register('newPassword', {
                required: 'New password is required',
                minLength: { value: 12, message: 'Password must be at least 12 characters' },
                maxLength: { value: 128, message: 'Password must be at most 128 characters' },
                validate: (v) =>
                  (/[a-z]/.test(v) &&
                    /[A-Z]/.test(v) &&
                    /[0-9]/.test(v) &&
                    /[^A-Za-z0-9]/.test(v)) ||
                  'Include upper, lower, number, and a special character',
              })}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 bg-transparent border-none cursor-pointer text-gray-400 p-1 transition-colors hover:text-primary"
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
          {errors.newPassword && (
            <p className="mt-1 text-[12px] text-red-600">{errors.newPassword.message}</p>
          )}
          <PasswordStrengthMeter password={newPasswordValue} />
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
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Re-enter your new password"
              {...register('confirmPassword', {
                required: 'Please confirm your new password',
                validate: (v) => v === watch('newPassword') || 'Passwords do not match',
              })}
              className={inputCls}
            />
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-[12px] text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !isValid}
          className="w-full h-[46px] bg-primary text-white border-none rounded-sm font-display text-[15px] font-bold cursor-pointer flex items-center justify-center gap-2 transition-[background] hover:bg-dark disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />
              Updating...
            </>
          ) : (
            'Update password'
          )}
        </button>
      </form>
    </div>
  )
}
