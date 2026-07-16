/**
 * Barrel file — re-exports all 6 models for clean imports elsewhere:
 *   import { User, Listing, ContactRequest } from '../models'
 *
 * Importing this file at server boot also forces Mongoose to register every schema
 * up front, so indexes (especially the 2dsphere geo-index on Listing) are created
 * before the first request hits any collection.
 */
export { User } from './user.model'
export type { IUser } from './user.model'

export { Listing } from './listing.model'
export type { IListing, GeoPoint, ListingLocation, ListingReport } from './listing.model'

export { ContactRequest } from './contactRequest.model'
export type { IContactRequest } from './contactRequest.model'

export { Message } from './message.model'
export type { IMessage } from './message.model'

export { Review } from './review.model'
export type { IReview } from './review.model'

export { Notification } from './notification.model'
export type { INotification } from './notification.model'

export { Kyc } from './kyc.model'
export type { IKyc, IKycAddress } from './kyc.model'
