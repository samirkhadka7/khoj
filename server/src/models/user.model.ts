import { Schema, model, Types } from 'mongoose'
import type { UserRole } from '../types'

/**
 * User document interface — the shape stored in MongoDB.
 * passwordHash is NEVER returned to the client (excluded by `select: false`).
 */
export interface IUser {
  _id: Types.ObjectId
  name: string
  email: string
  passwordHash: string
  role: UserRole
  phone?: string
  isPhoneVerified: boolean
  profilePhoto?: string
  bio?: string
  isVerified: boolean
  isBanned: boolean
  // --- MFA / TOTP (Feature 1) ---
  // mfaEnabled is the only MFA field returned to clients; the rest are select:false.
  mfaEnabled: boolean
  // AES-256-GCM encrypted TOTP secret (reversible — needed to recompute codes).
  mfaSecret?: string
  // Encrypted secret held DURING enrollment, before the user confirms one code.
  // Promoted to mfaSecret on successful enable; discarded otherwise.
  mfaPendingSecret?: string
  // One-time recovery codes, bcrypt-hashed at rest (like passwords — verify-only).
  // Each is single-use: usedAt is stamped when consumed and never reset.
  mfaBackupCodes?: { codeHash: string; usedAt?: Date }[]
  mfaEnabledAt?: Date
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      // Basic email shape — full validation happens via a dedicated lib in the auth controller
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    passwordHash: {
      type: String,
      required: true,
      // Never sent in query results unless explicitly .select('+passwordHash')
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'owner', 'admin'],
      default: 'user',
    },
    phone: {
      type: String,
      trim: true,
      // Nepali mobile numbers: 10 digits starting with 9
      match: [/^9\d{9}$/, 'Phone must be a 10-digit Nepali mobile number'],
    },
    isPhoneVerified: { type: Boolean, default: false },
    profilePhoto: { type: String }, // Cloudinary URL
    bio: { type: String, maxlength: 500 },
    isVerified: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },

    // --- MFA / TOTP (Feature 1) ---
    // Secrets are select:false so they are NEVER returned by a normal query /
    // profile fetch — a route must explicitly .select('+mfaSecret') to read them,
    // and that only happens in the login-MFA-verify path.
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String, select: false },
    mfaPendingSecret: { type: String, select: false },
    mfaBackupCodes: {
      type: [
        {
          _id: false,
          codeHash: { type: String, required: true },
          usedAt: { type: Date },
        },
      ],
      select: false,
      default: undefined, // omit the array entirely until MFA is enabled
    },
    mfaEnabledAt: { type: Date },
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
  }
)

// `email` is already unique via the `unique: true` flag above; no extra index needed.

export const User = model<IUser>('User', userSchema)



