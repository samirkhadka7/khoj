'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, Loader2, MessageSquare } from 'lucide-react'
import api from '@/lib/axios'
import { useDashboardUser } from '@/components/dashboard/DashboardContext'
import { ConversationRow } from '@/components/messages/ConversationRow'
import type { ApiResponse, ContactRequest } from '@/types'

/**
 * Conversation list — every accepted contact request is one chat thread.
 * Pulls /sent and /received in parallel, dedupes by _id, sorts by most recent
 * activity (respondedAt → createdAt fallback).
 */
export default function MessagesIndexPage() {
  const { user } = useDashboardUser()
  const [threads, setThreads] = useState<ContactRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [sentRes, receivedRes] = await Promise.all([
          api.get<ApiResponse<ContactRequest[]>>('/api/contact-request/sent?status=accepted'),
          api.get<ApiResponse<ContactRequest[]>>('/api/contact-request/received?status=accepted'),
        ])
        if (cancelled) return

        // De-dupe by _id — same user could be tenant on one and owner on another
        const map = new Map<string, ContactRequest>()
        ;[...(sentRes.data.data ?? []), ...(receivedRes.data.data ?? [])].forEach((r) =>
          map.set(r._id, r)
        )

        const all = Array.from(map.values()).sort(
          (a, b) =>
            new Date(b.respondedAt || b.createdAt).getTime() -
            new Date(a.respondedAt || a.createdAt).getTime()
        )
        setThreads(all)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[900px]">
      <div className="mb-6">
        <h1 className="font-display font-extrabold text-[28px] text-gray-800 tracking-[-0.5px]">
          Messages
          {!loading && threads.length > 0 && (
            <span className="text-gray-400 font-medium ml-2">({threads.length})</span>
          )}
        </h1>
        <p className="text-[14px] text-gray-600 mt-1">
          All your chat threads — one per accepted contact request.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-gray-400" />
        </div>
      ) : threads.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-lg p-12 text-center">
          <div className="w-14 h-14 mx-auto mb-3 bg-primary-subtle rounded-full flex items-center justify-center">
            <MessageSquare size={22} className="text-primary" />
          </div>
          <h3 className="font-display font-bold text-[16px] text-gray-800 mb-1">
            No conversations yet
          </h3>
          <p className="text-[13.5px] text-gray-600 max-w-[340px] mx-auto leading-[1.6]">
            Once an owner accepts your contact request, the chat unlocks here.
          </p>
          <Link
            href="/listings"
            className="inline-flex items-center gap-1.5 mt-5 h-10 px-4 bg-primary text-white rounded-sm font-semibold text-[13.5px] hover:bg-dark transition-colors"
          >
            Browse Listings
            <ArrowRight size={13} strokeWidth={2.5} />
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-lg overflow-hidden shadow-card">
          {threads.map((t) => (
            <ConversationRow key={t._id} request={t} viewerId={user._id} />
          ))}
        </div>
      )}
    </div>
  )
}
