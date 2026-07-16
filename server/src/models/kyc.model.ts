import { Schema, model, Types } from 'mongoose'
import type { KycStatus } from '../types'

/**
 * One KYC application per user (enforced by unique index on userId).
 *
 * Lifecycle:
 *   user submits  → status='pending'
 *   admin approve → status='approved' + User.role flipped to 'owner'
 *   admin reject  → status='rejected' + rejectionReason set
 *   user re-submit (only if rejected) → reuses the same doc, status flips back to 'pending'
 *
 * We track submittedAt and reviewedAt explicitly because resubmission needs to
 * update submittedAt without churning Mongoose's auto-`updatedAt`.
 */

export interface IKycAddress {
  district: string
  area: string
}

export interface IKyc {
  _id: Types.ObjectId
  userId: Types.ObjectId
  // --- Sensitive PII: stored AES-256-GCM ENCRYPTED at rest (Feature 4). ---
  // These hold ciphertext produced by utils/crypto.ts, NOT the plaintext value.
  // Decrypted only in authorized read paths (admin review / the user's own status).
  legalName: string
  phone: string
  isPhoneVerified: boolean
  address: IKycAddress
  // --- Document references: NO public URL is stored. ---
  // Each field holds the AES-256-GCM ciphertext of JSON `{ publicId, resourceType }`
  // pointing at a Cloudinary `type: 'authenticated'` asset (private — not resolvable
  // by URL alone). A short-lived signed download link is minted on demand instead.
  citizenshipFront: string
  citizenshipBack: string
  selfieWithId: string
  status: KycStatus
  rejectionReason?: string
  reviewedBy?: Types.ObjectId
  submittedAt: Date
  reviewedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const kycSchema = new Schema<IKyc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // one application per user; resubmission updates the same doc
    },
    // Encrypted (ciphertext) fields — the plaintext-format validators are removed
    // on purpose: a phone-number regex or a 200-char cap cannot apply to ciphertext.
    // The plaintext is validated in the controller BEFORE encryption instead.
    legalName: { type: String, required: true }, // AES-256-GCM ciphertext
    phone: { type: String, required: true }, // AES-256-GCM ciphertext
    isPhoneVerified: { type: Boolean, default: false },
    address: {
      district: { type: String, required: true }, // AES-256-GCM ciphertext
      area: { type: String, required: true }, // AES-256-GCM ciphertext
    },
    // Encrypted JSON `{ publicId, resourceType }` — never a resolvable URL.
    citizenshipFront: { type: String, required: true },
    citizenshipBack: { type: String, required: true },
    selfieWithId: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    rejectionReason: { type: String, maxlength: 500 },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
)

export const Kyc = model<IKyc>('Kyc', kycSchema)
