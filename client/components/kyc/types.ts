/**
 * Shared types + constants for the KYC become-owner flow.
 * Form primitives (Field, inputCls) live in `formPrimitives.tsx` since they
 * use JSX and can't sit in a `.ts` file.
 */

export interface StepInfo {
  legalName: string
  phone: string
  district: string
  area: string
}

export interface StepDocs {
  citizenshipFront: File | null
  citizenshipBack: File | null
  selfieWithId: File | null
}

export const PHONE_REGEX = /^9\d{9}$/
export const MAX_BYTES = 5 * 1024 * 1024
export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'application/pdf']
