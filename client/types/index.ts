/**
 * Frontend types — mirrors server/src/types/index.ts.
 * Keep these in sync if you change shared shapes on the server.
 */

/**
 * Account roles.
 *  - 'user'  : default role on register. Can browse + send contact requests.
 *  - 'owner' : flipped from 'user' by an admin after KYC approval.
 *  - 'admin' : platform staff.
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

export interface User {
  _id: string
  name: string
  email: string
  role: UserRole
  phone?: string
  isPhoneVerified: boolean
  profilePhoto?: string
  bio?: string
  isVerified: boolean
  createdAt: string
}

export interface GeoPoint {
  type: 'Point'
  coordinates: [number, number] // [lng, lat]
}

export interface Location {
  address: string
  area: string
  district: string
  coordinates: GeoPoint
}

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

export interface Listing {
  _id: string
  ownerId: string | User
  type: ListingType
  title: string
  description: string
  price: number
  negotiable: boolean
  location: Location
  images: string[]
  videoUrl?: string
  amenities: string[]
  typeFields: TypeFields
  isVerified: boolean
  isAvailable: boolean
  isFeatured: boolean
  viewCount: number
  wishlistedBy: string[]
  averageRating: number
  totalReviews: number
  createdAt: string
}

export interface ContactRequest {
  _id: string
  tenantId: string | User
  ownerId: string | User
  listingId: string | Listing
  message: string
  status: RequestStatus
  createdAt: string
  respondedAt?: string
  expiresAt: string
}

export interface Notification {
  _id: string
  userId: string
  type: NotificationType
  message: string
  relatedId: string
  read: boolean
  createdAt: string
}

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

// DTOs
export interface RegisterDTO {
  name: string
  email: string
  password: string
  // Optional — backend ignores `role` from input and always assigns 'user'
  phone?: string
}

export interface KycAddress {
  district: string
  area: string
}

export interface Kyc {
  _id: string
  userId: string | User
  legalName: string
  phone: string
  isPhoneVerified: boolean
  address: KycAddress
  citizenshipFront: string
  citizenshipBack: string
  selfieWithId: string
  status: KycStatus
  rejectionReason?: string
  reviewedBy?: string | User
  submittedAt: string
  reviewedAt?: string
  createdAt: string
  updatedAt: string
}

export interface LoginDTO {
  email: string
  password: string
}
