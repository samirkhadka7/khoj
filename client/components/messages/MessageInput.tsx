'use client'

import { Loader2, Send } from 'lucide-react'

/**
 * Composer textarea + send button.
 *
 * Behavior contract:
 *   - Enter sends, Shift+Enter inserts newline
 *   - `onChange` is called on every keystroke; the parent throttles the
 *     `chat:typing` socket emit, not this component
 *   - Disabled while disconnected so users don't queue up unsent messages
 */
export function MessageInput({
  draft,
  onChange,
  onSend,
  sending,
  disabled,
  placeholder,
}: {
  draft: string
  onChange: (val: string) => void
  onSend: () => void
  sending: boolean
  disabled: boolean
  placeholder: string
}) {
  return (
    <div className="bg-white border-t border-gray-100 px-4 sm:px-6 py-3 flex-shrink-0">
      <div className="max-w-[680px] mx-auto flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSend()
            }
          }}
          placeholder={placeholder}
          rows={1}
          maxLength={2000}
          disabled={disabled}
          className="flex-1 resize-none px-3.5 py-2.5 font-body text-[14.5px] text-gray-800 bg-gray-50 border-[1.5px] border-gray-200 rounded-md outline-none placeholder:text-gray-400 focus:border-primary focus:bg-white focus:shadow-[0_0_0_3px_rgba(29,158,117,.08)] transition-all max-h-[120px] disabled:opacity-50"
          style={{ minHeight: '42px' }}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!draft.trim() || disabled || sending}
          aria-label="Send message"
          className="w-[42px] h-[42px] flex items-center justify-center bg-primary text-white border-none rounded-md hover:bg-dark transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex-shrink-0"
        >
          {sending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} strokeWidth={2.5} />
          )}
        </button>
      </div>
      <p className="max-w-[680px] mx-auto text-[10.5px] text-gray-400 mt-1.5 px-1">
        Enter to send · Shift+Enter for newline
      </p>
    </div>
  )
}
