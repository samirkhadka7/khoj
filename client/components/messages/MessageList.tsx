'use client'

import { forwardRef } from 'react'
import { Send } from 'lucide-react'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import type { ChatMessage } from './types'

/**
 * Scrollable message area with day separators + bubble grouping.
 * The parent owns the scroll ref so it can auto-scroll on new messages
 * — that's why this is a forwardRef.
 */
export const MessageList = forwardRef<
  HTMLDivElement,
  {
    messages: ChatMessage[]
    myId: string
    otherTyping: boolean
    otherFirstName?: string
  }
>(function MessageList({ messages, myId, otherTyping, otherFirstName }, ref) {
  return (
    <div ref={ref} className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
      <div className="max-w-[680px] mx-auto space-y-2">
        {messages.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="w-12 h-12 mx-auto mb-3 bg-primary-subtle rounded-full flex items-center justify-center">
              <Send size={18} className="text-primary" />
            </div>
            <div className="font-display font-bold text-[14px] text-gray-700">
              Say hello to {otherFirstName ?? 'them'} 👋
            </div>
            <div className="text-[12.5px] mt-1">
              Owner accepted your request — you can chat freely now.
            </div>
          </div>
        ) : (
          renderGroups(messages, myId)
        )}

        {otherTyping && <TypingIndicator />}
      </div>
    </div>
  )
})

/**
 * Group messages by date and inject "Today" / "Yesterday" / full-date
 * separators between them. Bubbles from the same sender on the same day
 * stack tightly.
 */
function renderGroups(messages: ChatMessage[], myId: string) {
  const out: React.ReactElement[] = []
  let lastDay = ''

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]
    const day = formatDay(m.createdAt)
    if (day !== lastDay) {
      out.push(
        <div key={`day-${m._id}`} className="text-center py-3">
          <span className="text-[11.5px] font-semibold text-gray-400 bg-white border border-gray-100 px-2.5 py-0.5 rounded-full">
            {day}
          </span>
        </div>
      )
      lastDay = day
    }

    const mine = m.senderId === myId
    const prev = messages[i - 1]
    const grouped =
      !!prev && prev.senderId === m.senderId && day === formatDay(prev.createdAt)
    out.push(<MessageBubble key={m._id} msg={m} mine={mine} grouped={grouped} />)
  }
  return out
}

function formatDay(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  if (sameDay(d, now)) return 'Today'
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (sameDay(d, yesterday)) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
