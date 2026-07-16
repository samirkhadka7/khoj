'use client'

/**
 * Three bouncing dots — same animation timing as iMessage / WhatsApp.
 * Pure CSS via Tailwind's animate-bounce + staggered animationDelay.
 */
export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2 mt-1">
      <span
        className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
        style={{ animationDelay: '0ms' }}
      />
      <span
        className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
        style={{ animationDelay: '150ms' }}
      />
      <span
        className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
        style={{ animationDelay: '300ms' }}
      />
    </div>
  )
}
