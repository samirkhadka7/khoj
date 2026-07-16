import type {
  ListingType,
  HostelFields,
  RoomFields,
  OfficeFields,
  BusinessFields,
  TypeFields,
} from '../types'

type ValidationResult = { valid: true; data: TypeFields } | { valid: false; error: string }

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const isString = (v: unknown): v is string => typeof v === 'string'
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'
const isPosNum = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0
const oneOf = <T extends string>(v: unknown, values: readonly T[]): v is T =>
  isString(v) && (values as readonly string[]).includes(v)

/* -------------------------------------------------------------------------- */
/*  Per-type validators                                                        */
/* -------------------------------------------------------------------------- */

const validateHostel = (f: Record<string, unknown>): ValidationResult => {
  if (!oneOf(f.gender, ['boys', 'girls', 'mixed'] as const))
    return { valid: false, error: 'gender must be boys|girls|mixed' }
  if (!oneOf(f.roomType, ['single', 'double', 'dormitory'] as const))
    return { valid: false, error: 'roomType must be single|double|dormitory' }
  if (!isPosNum(f.totalBeds) || f.totalBeds < 1)
    return { valid: false, error: 'totalBeds must be a positive number' }
  if (!isBool(f.mealsIncluded)) return { valid: false, error: 'mealsIncluded must be boolean' }
  if (!isBool(f.visitorsAllowed)) return { valid: false, error: 'visitorsAllowed must be boolean' }
  if (f.curfewTime !== undefined && !isString(f.curfewTime))
    return { valid: false, error: 'curfewTime must be a string' }
  if (f.nearbyCollege !== undefined && !isString(f.nearbyCollege))
    return { valid: false, error: 'nearbyCollege must be a string' }

  const data: HostelFields = {
    gender: f.gender,
    roomType: f.roomType,
    totalBeds: f.totalBeds,
    mealsIncluded: f.mealsIncluded,
    visitorsAllowed: f.visitorsAllowed,
    curfewTime: f.curfewTime as string | undefined,
    nearbyCollege: f.nearbyCollege as string | undefined,
  }
  return { valid: true, data }
}

const validateRoom = (f: Record<string, unknown>): ValidationResult => {
  if (!oneOf(f.bhkType, ['single', '1BHK', '2BHK', '3BHK'] as const))
    return { valid: false, error: 'bhkType must be single|1BHK|2BHK|3BHK' }
  if (!oneOf(f.furnished, ['furnished', 'semi-furnished', 'unfurnished'] as const))
    return { valid: false, error: 'furnished must be furnished|semi-furnished|unfurnished' }
  if (!oneOf(f.forWhom, ['family', 'bachelor', 'both'] as const))
    return { valid: false, error: 'forWhom must be family|bachelor|both' }
  if (!isPosNum(f.depositAmount))
    return { valid: false, error: 'depositAmount must be a non-negative number' }
  if (!isPosNum(f.minStayMonths) || f.minStayMonths < 1)
    return { valid: false, error: 'minStayMonths must be at least 1' }
  if (!isBool(f.petAllowed)) return { valid: false, error: 'petAllowed must be boolean' }
  if (f.sqft !== undefined && !isPosNum(f.sqft))
    return { valid: false, error: 'sqft must be a non-negative number' }
  if (f.floor !== undefined && !isPosNum(f.floor))
    return { valid: false, error: 'floor must be a non-negative number' }
  if (f.facing !== undefined && !isString(f.facing))
    return { valid: false, error: 'facing must be a string' }

  const data: RoomFields = {
    bhkType: f.bhkType,
    furnished: f.furnished,
    forWhom: f.forWhom,
    depositAmount: f.depositAmount,
    minStayMonths: f.minStayMonths,
    petAllowed: f.petAllowed,
    sqft: f.sqft as number | undefined,
    floor: f.floor as number | undefined,
    facing: f.facing as string | undefined,
  }
  return { valid: true, data }
}

const validateOffice = (f: Record<string, unknown>): ValidationResult => {
  if (!oneOf(f.officeType, ['private', 'coworking', 'shared'] as const))
    return { valid: false, error: 'officeType must be private|coworking|shared' }
  if (!isPosNum(f.sqft)) return { valid: false, error: 'sqft must be a positive number' }
  if (!isPosNum(f.totalRooms)) return { valid: false, error: 'totalRooms must be a non-negative number' }
  if (!isPosNum(f.meetingRooms))
    return { valid: false, error: 'meetingRooms must be a non-negative number' }
  if (!isBool(f.dedicatedInternet))
    return { valid: false, error: 'dedicatedInternet must be boolean' }
  if (!isBool(f.liftAvailable)) return { valid: false, error: 'liftAvailable must be boolean' }
  if (!isPosNum(f.parkingSlots))
    return { valid: false, error: 'parkingSlots must be a non-negative number' }
  if (!isBool(f.fireSafetyCertified))
    return { valid: false, error: 'fireSafetyCertified must be boolean' }

  const data: OfficeFields = {
    officeType: f.officeType,
    sqft: f.sqft,
    totalRooms: f.totalRooms,
    meetingRooms: f.meetingRooms,
    dedicatedInternet: f.dedicatedInternet,
    liftAvailable: f.liftAvailable,
    parkingSlots: f.parkingSlots,
    fireSafetyCertified: f.fireSafetyCertified,
  }
  return { valid: true, data }
}

const validateBusiness = (f: Record<string, unknown>): ValidationResult => {
  if (!oneOf(f.spaceType, ['shop', 'showroom', 'warehouse', 'restaurant', 'other'] as const))
    return { valid: false, error: 'spaceType must be shop|showroom|warehouse|restaurant|other' }
  if (!isPosNum(f.sqft)) return { valid: false, error: 'sqft must be a positive number' }
  if (!isPosNum(f.roadFrontage))
    return { valid: false, error: 'roadFrontage must be a non-negative number' }
  if (!oneOf(f.floor, ['ground', 'first', 'basement', 'other'] as const))
    return { valid: false, error: 'floor must be ground|first|basement|other' }
  if (!oneOf(f.footTraffic, ['low', 'medium', 'high'] as const))
    return { valid: false, error: 'footTraffic must be low|medium|high' }
  if (!isBool(f.cornerPlot)) return { valid: false, error: 'cornerPlot must be boolean' }
  if (!isBool(f.storageRoom)) return { valid: false, error: 'storageRoom must be boolean' }
  if (!isBool(f.signageAllowed)) return { valid: false, error: 'signageAllowed must be boolean' }
  if (!isPosNum(f.minLeaseMonths) || f.minLeaseMonths < 1)
    return { valid: false, error: 'minLeaseMonths must be at least 1' }

  const data: BusinessFields = {
    spaceType: f.spaceType,
    sqft: f.sqft,
    roadFrontage: f.roadFrontage,
    floor: f.floor,
    footTraffic: f.footTraffic,
    cornerPlot: f.cornerPlot,
    storageRoom: f.storageRoom,
    signageAllowed: f.signageAllowed,
    minLeaseMonths: f.minLeaseMonths,
  }
  return { valid: true, data }
}

/* -------------------------------------------------------------------------- */
/*  Public dispatcher                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Validate that `typeFields` matches the shape required by the given listing type.
 * Returns the typed object on success or an error message on failure.
 */
export const validateTypeFields = (
  type: ListingType,
  typeFields: unknown
): ValidationResult => {
  if (!typeFields || typeof typeFields !== 'object') {
    return { valid: false, error: 'typeFields must be an object' }
  }

  const f = typeFields as Record<string, unknown>

  switch (type) {
    case 'hostel':
      return validateHostel(f)
    case 'room':
      return validateRoom(f)
    case 'office':
      return validateOffice(f)
    case 'business':
      return validateBusiness(f)
    default:
      return { valid: false, error: `Unknown listing type: ${type as string}` }
  }
}
