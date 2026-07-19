'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { ShieldCheck, Loader2, ArrowLeft } from 'lucide-react'
import api from '@/lib/axios'
import type { ApiResponse } from '@/types'
import type { AuthResult } from './authResult'

const INPUT_CLS =
  'w-full h-11 px-3.5 text-center tracking-[0.3em] font-body text-[16px] text-gray-800 bg-white border-[1.5px] border-gray-200 rounded-sm outline-none transition-[border-color,box-shadow] placeholder:tracking-normal placeholder:text-gray-400 focus:border-primary focus:shadow-[0_0_0_3px_rgba(29,158,117,.1)]'

/**
 * Second login step (Feature 1 UI): the server said mfaRequired, so we prompt for
 * the 6-digit authenticator code (or a backup code) and exchange it — with the
 * in-memory mfaToken — for a session. onResult routes the server response
 * (session vs. passwordExpired) back to the login state machine.
 */
export function MfaStep({
  mfaToken,
  onResult,
  onCancel,
}: {
  mfaToken: string
  onResult: (data: AuthResult) => boolean
  onCancel: () => void
}) {
  const [useBackup, setUseBackup] = useState(false)
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || submitting) return
    setSubmitting(true)
    try {
      const { data } = await api.post<ApiResponse<AuthResult>>('/api/auth/login/mfa', {
        mfaToken,
        code: code.trim(),
      })
      if (data.success && data.data && onResult(data.data)) return
      toast.error(data.message || 'Verification failed.')
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { message?: string } } }
      toast.error(e2.response?.data?.message || 'Invalid code. Please try again.')
      setCode('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="mb-4">
        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-[.6px] mb-[7px]">
          {useBackup ? 'Backup code' : 'Authenticator code'}
        </label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode={useBackup ? 'text' : 'numeric'}
          autoComplete="one-time-code"
          maxLength={useBackup ? 20 : 6}
          placeholder={useBackup ? 'xxxxx-xxxxx' : '••••••'}
          autoFocus
          aria-label={useBackup ? 'Backup code' : 'Authenticator code'}
          className={INPUT_CLS}
        />
      </div>

      <button
        type="submit"
        disabled={submitting || !code.trim()}
        className="w-full h-[46px] bg-primary text-white border-none rounded-sm font-display text-[15px] font-bold cursor-pointer flex items-center justify-center gap-2 transition-[background] hover:bg-dark disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <>
            <Loader2 size={16} strokeWidth={2.5} className="animate-spin" /> Verifying...
          </>
        ) : (
          <>
            <ShieldCheck size={15} strokeWidth={2.5} /> Verify
          </>
        )}
      </button>

      <div className="flex items-center justify-between mt-4 text-[13px]">
        <button
          type="button"
          onClick={() => {
            setUseBackup((v) => !v)
            setCode('')
          }}
          className="text-primary font-semibold hover:text-dark transition-colors"
        >
          {useBackup ? 'Use authenticator code' : 'Use a backup code instead'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
        >
          <ArrowLeft size={13} /> Back
        </button>
      </div>
    </form>
  )
}
