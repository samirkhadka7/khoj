'use client'

import { CheckCheck } from 'lucide-react'
import clsx from 'clsx'
import type { ChatMessage } from './types'

/**
 * Single message bubble. `mine` controls the side and color; `grouped`
 * tightens the top margin when this message is a follow-up from the same
 * sender on the same day.
 */
export function MessageBubble({
  msg,
  mine,
  grouped,
}: {
  msg: ChatMessage
  mine: boolean
  grouped: boolean
}) {
  return (
    <div
      className={clsx(
        'flex',
        mine ? 'justify-end' : 'justify-start',
        grouped ? 'mt-0.5' : 'mt-2'
      )}
    >
      <div
        className={clsx(
          'max-w-[75%] sm:max-w-[60%] px-3.5 py-2 text-[14px] leading-[1.45]',
          mine
            ? 'bg-primary text-white rounded-l-md rounded-tr-md rounded-br-sm'
            : 'bg-white text-gray-800 border border-gray-100 rounded-r-md rounded-tl-md rounded-bl-sm'
        )}
      >
        <div className="whitespace-pre-wrap break-words">{msg.content}</div>
        <div
          className={clsx(
            'flex items-center gap-1 justify-end mt-1 text-[10.5px]',
            mine ? 'text-white/70' : 'text-gray-400'
          )}
        >
          <span>{formatTime(msg.createdAt)}</span>
          {mine && (
            <CheckCheck
              size={12}
              strokeWidth={2.5}
              className={msg.read ? 'text-white' : 'text-white/50'}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}
