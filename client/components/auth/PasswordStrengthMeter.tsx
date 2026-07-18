'use client'

import zxcvbn from 'zxcvbn'

/**
 * Real-time password strength feedback (Feature 3).
 *
 * Combines two things as the user types:
 *  - zxcvbn score (0–4) → a colored strength bar + label + top warning/suggestion.
 *  - a live checklist mirroring the SERVER policy (utils/passwordPolicy.ts) so the
 *    user sees exactly which requirements are still missing, not just a vague score.
 */

const LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong']
const COLORS = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#16a34a']

const policyChecks = (pw: string) => [
  { label: 'At least 12 characters', ok: pw.length >= 12 },
  { label: 'Lowercase letter', ok: /[a-z]/.test(pw) },
  { label: 'Uppercase letter', ok: /[A-Z]/.test(pw) },
  { label: 'Number', ok: /[0-9]/.test(pw) },
  { label: 'Special character', ok: /[^A-Za-z0-9]/.test(pw) },
]

export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null

  const { score, feedback } = zxcvbn(password) // score: 0..4
  const checks = policyChecks(password)
  const hint = feedback.warning || feedback.suggestions?.[0] || ''

  return (
    <div className="mt-2" aria-live="polite">
      {/* strength bar (5 segments) */}
      <div className="flex gap-1 mb-1.5" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-colors"
            style={{ background: i <= score ? COLORS[score] : '#e5e7eb' }}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 text-[11.5px] mb-1.5">
        <span className="font-bold" style={{ color: COLORS[score] }}>
          {LABELS[score]}
        </span>
        {hint && <span className="text-gray-500 text-right truncate">{hint}</span>}
      </div>

      {/* live policy checklist */}
      <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        {checks.map((c) => (
          <li
            key={c.label}
            className={`text-[11px] flex items-center gap-1 ${c.ok ? 'text-primary' : 'text-gray-400'}`}
          >
            <span className="w-3 inline-block">{c.ok ? '✓' : '○'}</span>
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
