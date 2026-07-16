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
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
  }
)

// `email` is already unique via the `unique: true` flag above; no extra index needed.

export const User = model<IUser>('User', userSchema)



