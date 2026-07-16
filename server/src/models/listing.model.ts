import { Schema, model, Types } from 'mongoose'
import type { ListingType, TypeFields } from '../types'

/**
 * GeoJSON Point — required format for MongoDB 2dsphere queries ($near, $geoWithin).
 * IMPORTANT: coordinates MUST be [longitude, latitude] (lng first, lat second).
 */
export interface GeoPoint {
  type: 'Point'
  coordinates: [number, number] // [lng, lat]
}

export interface ListingLocation {
  address: string
  area: string
  district: string
  coordinates: GeoPoint
}

export interface ListingReport {
  userId: Types.ObjectId
  reason: string
  createdAt: Date
}

export interface IListing {
  _id: Types.ObjectId
  ownerId: Types.ObjectId
  type: ListingType
  title: string
  description: string
  price: number
  negotiable: boolean
  location: ListingLocation
  images: string[]
  videoUrl?: string
  amenities: string[]
  typeFields: TypeFields
  isVerified: boolean
  isAvailable: boolean
  isFeatured: boolean
  viewCount: number
  wishlistedBy: Types.ObjectId[]
  averageRating: number
  totalReviews: number
  reports: ListingReport[]
  createdAt: Date
  updatedAt: Date
}

const reportSchema = new Schema<ListingReport>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, maxlength: 500 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const listingSchema = new Schema<IListing>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['hostel', 'room', 'office', 'business'],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 5000 },
    price: { type: Number, required: true, min: 0, index: true },
    negotiable: { type: Boolean, default: false },

    location: {
      address: { type: String, required: true },
      area: { type: String, required: true, index: true },
      district: { type: String, required: true, index: true },
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
          required: true,
        },
        coordinates: {
          type: [Number], // [lng, lat]
          required: true,
          validate: {
            validator: (v: number[]) => v.length === 2,
            message: 'coordinates must be [lng, lat]',
          },
        },
      },
    },

    images: {
      type: [String],
      validate: {
        validator: (arr: string[]) => arr.length <= 10,
        message: 'Max 10 images per listing',
      },
      default: [],
    },
    videoUrl: { type: String },
    amenities: { type: [String], default: [] },

    // Mixed in Mongoose because shape varies by `type` (Hostel/Room/Office/Business).
    // Validation of the correct shape happens in the listing controller before save.
    typeFields: {
      type: Schema.Types.Mixed,
      required: true,
    },

    isVerified: { type: Boolean, default: false, index: true },
    isAvailable: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },

    wishlistedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },

    reports: { type: [reportSchema], default: [] },
  },
  { timestamps: true }
)

// 2dsphere index — required for $near / $geoWithin queries on the map view
listingSchema.index({ 'location.coordinates': '2dsphere' })

// Common compound index for the search page's most-used filter combo
listingSchema.index({ type: 1, 'location.district': 1, price: 1 })

export const Listing = model<IListing>('Listing', listingSchema)
