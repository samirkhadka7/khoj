import { z } from 'zod'

/**
 * Single zod schema for the entire 5-step form.
 *
 * The trick: every field is REQUIRED for the final submit, but the form mounts
 * with empty defaults. We don't pass this resolver to react-hook-form directly
 * — instead we run `schema.safeParse(values)` at final-submit time, and use
 * `form.trigger([...])` per step for incremental validation.
 *
 * Why not the resolver? rhf's resolver runs on every blur/change, so an empty
 * Step 1 field would error on Step 4. trigger() lets us validate only the
 * fields visible in the current step.
 */

export const HostelFieldsSchema = z.object({
  gender: z.enum(['boys', 'girls', 'mixed']),
  roomType: z.enum(['single', 'double', 'dormitory']),
  totalBeds: z.coerce.number().int().min(1, 'At least 1 bed'),
  mealsIncluded: z.boolean(),
  curfewTime: z.string().optional(),
  visitorsAllowed: z.boolean(),
  nearbyCollege: z.string().optional(),
})

export const RoomFieldsSchema = z.object({
  bhkType: z.enum(['single', '1BHK', '2BHK', '3BHK']),
  furnished: z.enum(['furnished', 'semi-furnished', 'unfurnished']),
  forWhom: z.enum(['family', 'bachelor', 'both']),
  depositAmount: z.coerce.number().min(0, 'Cannot be negative'),
  minStayMonths: z.coerce.number().int().min(1, 'At least 1 month'),
  sqft: z.coerce.number().min(0).optional(),
  floor: z.coerce.number().int().min(0).optional(),
  petAllowed: z.boolean(),
  facing: z.string().optional(),
})

export const OfficeFieldsSchema = z.object({
  officeType: z.enum(['private', 'coworking', 'shared']),
  sqft: z.coerce.number().min(1, 'Sq ft required'),
  totalRooms: z.coerce.number().int().min(0),
  meetingRooms: z.coerce.number().int().min(0),
  dedicatedInternet: z.boolean(),
  liftAvailable: z.boolean(),
  parkingSlots: z.coerce.number().int().min(0),
  fireSafetyCertified: z.boolean(),
})

export const BusinessFieldsSchema = z.object({
  spaceType: z.enum(['shop', 'showroom', 'warehouse', 'restaurant', 'other']),
  sqft: z.coerce.number().min(1, 'Sq ft required'),
  roadFrontage: z.coerce.number().min(0),
  floor: z.enum(['ground', 'first', 'basement', 'other']),
  footTraffic: z.enum(['low', 'medium', 'high']),
  cornerPlot: z.boolean(),
  storageRoom: z.boolean(),
  signageAllowed: z.boolean(),
  minLeaseMonths: z.coerce.number().int().min(1),
})

export const NewListingSchema = z.object({
  type: z.enum(['hostel', 'room', 'office', 'business']),
  title: z.string().min(1, 'Title is required').max(100, 'Max 100 characters'),
  description: z.string().min(1, 'Description is required').max(500, 'Max 500 characters'),
  price: z.coerce.number().min(1, 'Price required'),
  negotiable: z.boolean(),
  address: z.string().min(1, 'Address is required'),
  area: z.string().min(1, 'Area is required'),
  district: z.string().min(1, 'District is required'),
  lat: z.coerce.number().refine((v) => v >= -90 && v <= 90, 'Invalid latitude'),
  lng: z.coerce.number().refine((v) => v >= -180 && v <= 180, 'Invalid longitude'),
  amenities: z.array(z.string()).default([]),
  // Validated per `type` at submit time, not via Zod (different shapes per type)
  typeFields: z.unknown().optional(),
  photos: z.array(z.instanceof(File)).max(10, 'Max 10 photos'),
  isAvailable: z.boolean().default(true),
})

export type NewListingForm = z.infer<typeof NewListingSchema>

/**
 * Default empty values for the form. Useful for re-mount after submission.
 */
export const DEFAULT_FORM: NewListingForm = {
  type: 'hostel',
  title: '',
  description: '',
  price: 0,
  negotiable: false,
  address: '',
  area: '',
  district: 'Kathmandu',
  lat: 27.7172,
  lng: 85.324,
  amenities: [],
  typeFields: undefined,
  photos: [],
  isAvailable: true,
}

/**
 * Nepal districts list — populated as a select dropdown in Step 2.
 * (77 administrative districts of Nepal.)
 */
export const NEPAL_DISTRICTS = [
  // Province 1 (Koshi)
  'Bhojpur', 'Dhankuta', 'Ilam', 'Jhapa', 'Khotang', 'Morang', 'Okhaldhunga',
  'Panchthar', 'Sankhuwasabha', 'Solukhumbu', 'Sunsari', 'Taplejung', 'Terhathum',
  'Udayapur',
  // Madhesh
  'Bara', 'Dhanusha', 'Mahottari', 'Parsa', 'Rautahat', 'Saptari', 'Sarlahi', 'Siraha',
  // Bagmati
  'Bhaktapur', 'Chitwan', 'Dhading', 'Dolakha', 'Kathmandu', 'Kavrepalanchok',
  'Lalitpur', 'Makwanpur', 'Nuwakot', 'Ramechhap', 'Rasuwa', 'Sindhuli', 'Sindhupalchok',
  // Gandaki
  'Baglung', 'Gorkha', 'Kaski', 'Lamjung', 'Manang', 'Mustang', 'Myagdi',
  'Nawalpur', 'Parbat', 'Syangja', 'Tanahun',
  // Lumbini
  'Arghakhanchi', 'Banke', 'Bardiya', 'Dang', 'Eastern Rukum', 'Gulmi', 'Kapilvastu',
  'Parasi', 'Palpa', 'Pyuthan', 'Rolpa', 'Rupandehi',
  // Karnali
  'Dailekh', 'Dolpa', 'Humla', 'Jajarkot', 'Jumla', 'Kalikot', 'Mugu', 'Salyan',
  'Surkhet', 'Western Rukum',
  // Sudurpashchim
  'Achham', 'Baitadi', 'Bajhang', 'Bajura', 'Dadeldhura', 'Darchula', 'Doti',
  'Kailali', 'Kanchanpur',
].sort()

export const AMENITIES_LIST = [
  'WiFi',
  'Hot Water',
  'Parking',
  'AC',
  'Meals',
  'Laundry',
  'Security/CCTV',
  'Generator',
  'Drinking Water',
  'Solar',
  'Study Room',
  'Elevator',
  '24/7 Access',
  'Kitchen',
  'Balcony',
  'Reception',
] as const
