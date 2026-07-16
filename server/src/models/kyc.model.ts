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
  legalName: string
  phone: string
  isPhoneVerified: boolean
  address: IKycAddress
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
    legalName: { type: String, required: true, trim: true, maxlength: 200 },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^9\d{9}$/, 'Phone must be a 10-digit Nepali mobile number'],
    },
    isPhoneVerified: { type: Boolean, default: false },
    address: {
      district: { type: String, required: true, trim: true },
      area: { type: String, required: true, trim: true },
    },
    citizenshipFront: { type: String, required: true }, // Cloudinary URL
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
