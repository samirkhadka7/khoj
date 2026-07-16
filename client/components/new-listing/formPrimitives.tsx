'use client'

import clsx from 'clsx'

/* -------------------------------------------------------------------------- */
/*  Form-field primitives shared by Step3 / Step4.                            */
/*  Step2 has its own copy of `Field` and `inputCls` because they're tied to  */
/*  layout there. Keep these tied to *behavior* — radios, toggles.            */
/* -------------------------------------------------------------------------- */

export function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-[7px]">
        <label className="block text-[12px] font-bold text-gray-600 uppercase tracking-[.6px]">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {hint && <span className="text-[11.5px] text-gray-400 font-medium">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1 text-[12px] text-red-600">{error}</p>}
    </div>
  )
}

export const inputCls = (err: boolean) =>
  `w-full h-11 px-3.5 font-body text-[14.5px] text-gray-800 bg-white border-[1.5px] rounded-sm outline-none transition-[border-color,box-shadow] placeholder:text-gray-400 ${
    err
      ? 'border-red-400 focus:border-red-500'
      : 'border-gray-200 focus:border-primary focus:shadow-[0_0_0_3px_rgba(29,158,117,.1)]'
  }`

export function RadioGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T | undefined
  onChange: (v: T) => void
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={clsx(
              'h-11 px-3 rounded-sm border-[1.5px] font-medium text-[13.5px] transition-all',
              active
                ? 'border-primary bg-primary-subtle text-dark-mid'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description?: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center justify-between gap-4 w-full bg-white border-[1.5px] border-gray-200 rounded-sm px-4 h-12 hover:border-gray-300 transition-colors text-left"
    >
      <div className="min-w-0">
        <div className="text-[13.5px] font-medium text-gray-800">{label}</div>
        {description && <div className="text-[11.5px] text-gray-400 mt-0.5">{description}</div>}
      </div>
      <span
        className={clsx(
          'w-10 h-[22px] rounded-full p-0 relative transition-colors flex-shrink-0',
          value ? 'bg-primary' : 'bg-gray-300'
        )}
      >
        <span
          className={clsx(
            'absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform',
            value ? 'translate-x-[18px]' : 'translate-x-0'
          )}
        />
      </span>
    </button>
  )
}
