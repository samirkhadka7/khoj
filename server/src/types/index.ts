/**
 * Shared TypeScript types for BaasKhoj backend.
 * These mirror the spec exactly — keep client/types and server/types in sync.
 */

/* -------------------------------------------------------------------------- */
/*  Enums (string-literal unions)                                             */
/* -------------------------------------------------------------------------- */

/**
 * User account roles.
 *  - 'user'   : default role on registration. Can browse + send contact requests.
 *  - 'owner'  : flipped from 'user' by an admin after KYC approval. Can list properties.
 *  - 'admin'  : platform staff. Promoted via DB only.
 */
export type UserRole = 'user' | 'owner' | 'admin'

export type ListingType = 'hostel' | 'room' | 'office' | 'business'

export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'expired'

export type KycStatus = 'pending' | 'approved' | 'rejected'

export type NotificationType =
  | 'contact_request'
  | 'request_accepted'
  | 'request_rejected'
  | 'new_review'
  | 'listing_verified'
  | 'kyc_approved'
  | 'kyc_rejected'

/* -------------------------------------------------------------------------- */
/*  Listing type-specific fields                                              */
/*  Stored as Mixed in Mongoose; validated at the controller layer.           */
/* -------------------------------------------------------------------------- */

export interface HostelFields {
  gender: 'boys' | 'girls' | 'mixed'
  roomType: 'single' | 'double' | 'dormitory'
  totalBeds: number
  mealsIncluded: boolean
  curfewTime?: string
  visitorsAllowed: boolean
  nearbyCollege?: string
}

export interface RoomFields {
  bhkType: 'single' | '1BHK' | '2BHK' | '3BHK'
  furnished: 'furnished' | 'semi-furnished' | 'unfurnished'
  forWhom: 'family' | 'bachelor' | 'both'
  depositAmount: number
  minStayMonths: number
  sqft?: number
  floor?: number
  petAllowed: boolean
  facing?: string
}

export interface OfficeFields {
  officeType: 'private' | 'coworking' | 'shared'
  sqft: number
  totalRooms: number
  meetingRooms: number
  dedicatedInternet: boolean
  liftAvailable: boolean
  parkingSlots: number
  fireSafetyCertified: boolean
}

export interface BusinessFields {
  spaceType: 'shop' | 'showroom' | 'warehouse' | 'restaurant' | 'other'
  sqft: number
  roadFrontage: number
  floor: 'ground' | 'first' | 'basement' | 'other'
  footTraffic: 'low' | 'medium' | 'high'
  cornerPlot: boolean
  storageRoom: boolean
  signageAllowed: boolean
  minLeaseMonths: number
}

export type TypeFields = HostelFields | RoomFields | OfficeFields | BusinessFields

/* -------------------------------------------------------------------------- */
/*  Standard API response shape — used by every controller                    */
/* -------------------------------------------------------------------------- */

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
}
