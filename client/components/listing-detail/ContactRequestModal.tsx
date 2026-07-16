'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { CheckCircle2, Clock, Loader2, Send, ShieldCheck, X } from 'lucide-react'
import api from '@/lib/axios'
import type { ApiResponse, ContactRequest, Listing, User } from '@/types'

interface ContactRequestModalProps {
  open: boolean
  onClose: () => void
  listing: Listing
}

interface FormValues {
  message: string
}

/**
 * Two-step modal:
 *   1. Form — tenant types message and submits
 *   2. Success — shows that the request was sent + 48h timeline
 *
 * The protected reveal of owner phone/WhatsApp does NOT happen here —
 * that lives on /dashboard/contact-requests after the owner accepts.
 */
export function ContactRequestModal({ open, onClose, listing }: ContactRequestModalProps) {
  const [done, setDone] = useState(false)
  const owner = typeof listing.ownerId === 'object' ? (listing.ownerId as User) : null

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ mode: 'onChange' })

  const handleClose = () => {
    onClose()
    // Reset internal state after the modal animates out
    setTimeout(() => {
      setDone(false)
      reset()
    }, 200)
  }

  const onSubmit = async ({ message }: FormValues) => {
    try {
      await api.post<ApiResponse<ContactRequest>>('/api/contact-request', {
        listingId: listing._id,
        message,
      })
      setDone(true)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      toast.error(e.response?.data?.message || e.message || 'Failed to send request')
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-[460px] bg-white rounded-lg overflow-hidden"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Brand strip */}
        <div
          className="h-1"
          style={{
            background:
              'linear-gradient(90deg, var(--dark) 0%, var(--primary) 50%, #5dce9e 100%)',
          }}
        />

        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="absolute right-3.5 top-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="px-7 py-7">
          {!done ? (
            <>
              {/* Listing snippet */}
              <div className="flex gap-3 items-center pb-5 mb-5 border-b border-gray-100">
                <div className="w-14 h-14 rounded-md bg-primary-subtle flex items-center justify-center text-2xl flex-shrink-0">
                  🏠
                </div>
                <div className="min-w-0">
                  <div className="font-display font-bold text-[15px] text-gray-800 truncate">
                    {listing.title}
                  </div>
                  <div className="text-[13px] text-gray-400 mt-0.5 truncate">
                    {listing.location.area}, {listing.location.district}
                  </div>
                  <div className="font-display font-extrabold text-[14px] text-primary mt-1">
                    NPR {listing.price.toLocaleString('en-IN')}
                    <span className="text-[11px] text-gray-400 font-normal">/month</span>
                  </div>
                </div>
              </div>

              {/* Owner */}
              {owner && (
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-primary-subtle flex items-center justify-center text-primary font-display font-bold text-[14px] flex-shrink-0">
                    {owner.name?.[0]?.toUpperCase() || 'O'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold text-gray-800 flex items-center gap-1">
                      {owner.name}
                      {owner.isVerified && (
                        <ShieldCheck size={13} className="text-primary" strokeWidth={2.5} />
                      )}
                    </div>
                    <div className="text-[12px] text-gray-400">Owner — usually replies in 2 hours</div>
                  </div>
                </div>
              )}

              <h2 className="font-display font-extrabold text-[18px] text-gray-800 tracking-[-0.2px] mb-1.5">
                Send a contact request
              </h2>
              <p className="text-[13px] text-gray-600 leading-[1.6] mb-5">
                Introduce yourself briefly. The owner will see your name and message before
                deciding to share their contact info.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-[.6px] mb-[7px]">
                  Your message
                </label>
                <textarea
                  rows={5}
                  placeholder="Namaste, ma yo space ko bareme jaannu chahanchhu. Visit garna sakinchha ke?"
                  {...register('message', {
                    required: 'Message is required',
                    minLength: { value: 5, message: 'Message must be at least 5 characters' },
                    maxLength: { value: 1000, message: 'Message is too long (max 1000 chars)' },
                  })}
                  className="w-full px-3.5 py-3 font-body text-[14px] text-gray-800 bg-white border-[1.5px] border-gray-200 rounded-sm outline-none resize-none placeholder:text-gray-400 focus:border-primary focus:shadow-[0_0_0_3px_rgba(29,158,117,.1)] transition-all"
                />
                {errors.message && (
                  <p className="mt-1 text-[12px] text-red-600">{errors.message.message}</p>
                )}

                <div className="flex items-start gap-2 mt-4 mb-5 px-3 py-2.5 bg-primary-subtle/60 rounded-sm">
                  <Clock size={14} className="text-primary mt-px flex-shrink-0" strokeWidth={2.5} />
                  <p className="text-[12.5px] text-dark-mid leading-[1.5]">
                    The owner has 48 hours to respond. If accepted, you&apos;ll see their phone
                    and WhatsApp.
                  </p>
                </div>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 h-[44px] bg-white border-[1.5px] border-gray-200 rounded-sm font-body text-[14px] font-semibold text-gray-800 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 h-[44px] bg-primary text-white border-none rounded-sm font-display text-[14px] font-bold flex items-center justify-center gap-2 hover:bg-dark hover:-translate-y-px transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:translate-y-0"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={13} strokeWidth={2.5} />
                        Send Request
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            // Success state
            <div className="text-center py-2">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-subtle flex items-center justify-center">
                <CheckCircle2 size={36} className="text-primary" strokeWidth={2} />
              </div>
              <h2 className="font-display font-extrabold text-[20px] text-gray-800 mb-2">
                Request sent!
              </h2>
              <p className="text-[14px] text-gray-600 max-w-[320px] mx-auto leading-[1.6] mb-6">
                {owner?.name || 'The owner'} has 48 hours to respond. You&apos;ll get a
                notification as soon as they decide.
              </p>
              <Link
                href="/dashboard/contact-requests"
                className="inline-flex items-center justify-center h-[44px] px-6 bg-primary text-white border-none rounded-sm font-display text-[14px] font-bold hover:bg-dark transition-colors"
                onClick={handleClose}
              >
                View My Requests
              </Link>
              <button
                type="button"
                onClick={handleClose}
                className="block mx-auto mt-3 text-[13px] text-gray-400 hover:text-primary transition-colors"
              >
                Continue browsing
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
