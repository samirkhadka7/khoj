import type { Request, Response } from 'express'
import mongoose, { type FilterQuery } from 'mongoose'
import { Listing, type IListing } from '../models'
import type { ListingType } from '../types'
import { asyncHandler } from '../utils/asyncHandler'
import {
  deleteFromCloudinary,
  deleteManyFromCloudinary,
  uploadToCloudinary,
} from '../utils/cloudinary'
import { validateTypeFields } from '../utils/validateTypeFields'
import { escapeRegex } from '../utils/escapeRegex'

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const VALID_TYPES: ListingType[] = ['hostel', 'room', 'office', 'business']

/**
 * Mongoose `.select()` projection used on every PUBLIC listing read.
 * Strips two fields:
 *   - `reports`        — contains reporter user IDs + reasons. Admin only.
 *   - `wishlistedBy`   — exposes user IDs of who wishlisted. Privacy leak.
 *
 * Use `PUBLIC_LISTING_PROJECTION` on `find` / `findById` chains. For owner-
 * only / admin-only endpoints, the full doc is fine.
 */
const PUBLIC_LISTING_PROJECTION = '-reports -wishlistedBy'

/**
 * FormData sends every non-file value as a string. This parses the few fields
 * we know are not strings (numbers, booleans, JSON blobs) so the rest of the
 * controller can treat them as their real types.
 */
const coerceListingBody = (body: Record<string, unknown>) => {
  const num = (v: unknown) =>
    v === undefined || v === '' ? undefined : Number(v as string)
  const bool = (v: unknown) => v === true || v === 'true' || v === '1'
  const parseJson = (v: unknown): unknown => {
    if (v === undefined || v === null || v === '') return undefined
    if (typeof v === 'object') return v
    try {
      return JSON.parse(v as string)
    } catch {
      return undefined
    }
  }

  return {
    title: typeof body.title === 'string' ? body.title.trim() : undefined,
    description: typeof body.description === 'string' ? body.description.trim() : undefined,
    price: num(body.price),
    negotiable: bool(body.negotiable),
    type: body.type as ListingType | undefined,
    address: typeof body.address === 'string' ? body.address.trim() : undefined,
    area: typeof body.area === 'string' ? body.area.trim() : undefined,
    district: typeof body.district === 'string' ? body.district.trim() : undefined,
    lat: num(body.lat),
    lng: num(body.lng),
    // amenities can come as repeated form field "amenities" OR a single comma-separated string
    amenities: Array.isArray(body.amenities)
      ? (body.amenities as string[])
      : typeof body.amenities === 'string'
        ? body.amenities.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    typeFields: parseJson(body.typeFields),
    isAvailable: body.isAvailable === undefined ? undefined : bool(body.isAvailable),
    videoUrl: typeof body.videoUrl === 'string' ? body.videoUrl : undefined,
  }
}

/* -------------------------------------------------------------------------- */
/*  POST /api/listings   (owner)                                              */
/* -------------------------------------------------------------------------- */

export const createListing = asyncHandler(async (req: Request, res: Response) => {
  const b = coerceListingBody(req.body as Record<string, unknown>)

  // --- Required fields ---
  if (!b.title || !b.description || b.price === undefined || !b.type) {
    res.status(400).json({
      success: false,
      message: 'title, description, price, and type are required',
    })
    return
  }

  if (!VALID_TYPES.includes(b.type)) {
    res.status(400).json({ success: false, message: `type must be one of: ${VALID_TYPES.join(', ')}` })
    return
  }

  if (!b.address || !b.area || !b.district || b.lat === undefined || b.lng === undefined) {
    res.status(400).json({
      success: false,
      message: 'address, area, district, lat, and lng are all required',
    })
    return
  }

  // --- Validate the per-type subfields ---
  const tfResult = validateTypeFields(b.type, b.typeFields)
  if (!tfResult.valid) {
    res.status(400).json({ success: false, message: `typeFields invalid: ${tfResult.error}` })
    return
  }

  // --- Upload images to Cloudinary in parallel ---
  // multer's `array('images', 10)` populates req.files
  const files = (req.files as Express.Multer.File[] | undefined) ?? []
  const imageUrls = files.length > 0
    ? await Promise.all(files.map((f) => uploadToCloudinary(f, 'baskhoj/listings')))
    : []

  // --- Create the listing ---
  const listing = await Listing.create({
    ownerId: req.user!.userId,
    type: b.type,
    title: b.title,
    description: b.description,
    price: b.price,
    negotiable: b.negotiable,
    location: {
      address: b.address,
      area: b.area,
      district: b.district,
      // GeoJSON requires [lng, lat] — order matters for 2dsphere queries
      coordinates: { type: 'Point', coordinates: [b.lng, b.lat] },
    },
    images: imageUrls,
    videoUrl: b.videoUrl,
    amenities: b.amenities,
    typeFields: tfResult.data,
  })

  res.status(201).json({ success: true, data: listing })
})

/* -------------------------------------------------------------------------- */
/*  GET /api/listings   (public — search + filter + pagination + geo)         */
/* -------------------------------------------------------------------------- */

export const listListings = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query

  const page = Math.max(1, Number(q.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(q.limit) || 12))

  const filter: FilterQuery<IListing> = {}

  if (q.type && VALID_TYPES.includes(q.type as ListingType)) {
    filter.type = q.type as ListingType
  }
  // Escape user input — `new RegExp(rawString)` would otherwise let a malicious
  // query like `(a+)+$` cause catastrophic backtracking (ReDoS).
  if (q.area) filter['location.area'] = new RegExp(escapeRegex(String(q.area)), 'i')
  if (q.district) filter['location.district'] = new RegExp(escapeRegex(String(q.district)), 'i')

  // Price range
  const minPrice = Number(q.minPrice)
  const maxPrice = Number(q.maxPrice)
  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    filter.price = {}
    if (Number.isFinite(minPrice)) filter.price.$gte = minPrice
    if (Number.isFinite(maxPrice)) filter.price.$lte = maxPrice
  }

  // Amenities — must contain ALL specified
  if (q.amenities) {
    const list = String(q.amenities).split(',').map((s) => s.trim()).filter(Boolean)
    if (list.length > 0) filter.amenities = { $all: list }
  }

  if (q.verifiedOnly === 'true') filter.isVerified = true
  if (q.furnished) filter['typeFields.furnished'] = String(q.furnished)

  // Geo $near — needs lat, lng, optional radius (km, default 5km)
  if (q.lat && q.lng) {
    const lat = Number(q.lat)
    const lng = Number(q.lng)
    const radiusKm = Number(q.radius) || 5
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      filter['location.coordinates'] = {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusKm * 1000, // meters
        },
      }
    }
  }

  // Free-text search on title (regex; swap for $text index later if perf becomes an issue)
  if (q.search) {
    filter.title = new RegExp(escapeRegex(String(q.search)), 'i')
  }

  // Hide sold/unavailable from public search by default
  if (q.includeUnavailable !== 'true') {
    filter.isAvailable = true
  }

  const total = await Listing.countDocuments(filter)

  // Featured first → verified → newest. Geo queries already sort by distance, so skip our sort then.
  const isGeo = q.lat && q.lng
  const cursor = Listing.find(filter)
    .select(PUBLIC_LISTING_PROJECTION)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('ownerId', 'name profilePhoto isVerified')

  if (!isGeo) cursor.sort({ isFeatured: -1, isVerified: -1, createdAt: -1 })

  const items = await cursor

  res.json({
    success: true,
    data: items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  })
})

/* -------------------------------------------------------------------------- */
/*  GET /api/listings/compare?ids=id1,id2,id3   (public)                      */
/* -------------------------------------------------------------------------- */

export const compareListings = asyncHandler(async (req: Request, res: Response) => {
  const raw = String(req.query.ids || '')
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean)

  if (ids.length < 2 || ids.length > 3) {
    res.status(400).json({ success: false, message: 'Provide 2 or 3 listing ids' })
    return
  }

  const valid = ids.every((id) => mongoose.isValidObjectId(id))
  if (!valid) {
    res.status(400).json({ success: false, message: 'One or more invalid listing ids' })
    return
  }

  const listings = await Listing.find({ _id: { $in: ids } })
    .select(PUBLIC_LISTING_PROJECTION)
    .populate('ownerId', 'name')
  res.json({ success: true, data: listings })
})

/* -------------------------------------------------------------------------- */
/*  GET /api/listings/owner/my-listings   (owner)                             */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*  GET /api/listings/wishlist   (any authenticated user)                     */
/*  Returns the user's wishlisted listings, paginated.                        */
/*  Replaces the old client-side filter that depended on `wishlistedBy` being */
/*  publicly readable — that field is now stripped from public responses.    */
/* -------------------------------------------------------------------------- */

export const wishlistListings = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))

  const filter = { wishlistedBy: req.user!.userId }
  const total = await Listing.countDocuments(filter)
  const listings = await Listing.find(filter)
    .select(PUBLIC_LISTING_PROJECTION)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('ownerId', 'name profilePhoto isVerified')

  res.json({
    success: true,
    data: listings,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  })
})

/* -------------------------------------------------------------------------- */
/*  GET /api/listings/owner/my-listings   (owner)                             */
/* -------------------------------------------------------------------------- */

export const myListings = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))

  const filter = { ownerId: req.user!.userId }
  const total = await Listing.countDocuments(filter)
  const listings = await Listing.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)

  res.json({
    success: true,
    data: listings,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  })
})

/* -------------------------------------------------------------------------- */
/*  GET /api/listings/:id   (public — increments viewCount)                   */
/* -------------------------------------------------------------------------- */

export const getListing = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid listing id' })
    return
  }

  // Atomic increment + return updated doc — avoids two round trips to DB.
  // Strip reports + wishlistedBy from this PUBLIC endpoint (leak fix).
  const listing = await Listing.findByIdAndUpdate(
    id,
    { $inc: { viewCount: 1 } },
    { new: true }
  )
    .select(PUBLIC_LISTING_PROJECTION)
    .populate('ownerId', 'name profilePhoto isVerified createdAt')

  if (!listing) {
    res.status(404).json({ success: false, message: 'Listing not found' })
    return
  }

  res.json({ success: true, data: listing })
})

/* -------------------------------------------------------------------------- */
/*  PUT /api/listings/:id   (owner-only, own listing)                         */
/* -------------------------------------------------------------------------- */

export const updateListing = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid listing id' })
    return
  }

  const listing = await Listing.findById(id)
  if (!listing) {
    res.status(404).json({ success: false, message: 'Listing not found' })
    return
  }

  // Ownership check — admin can also edit (for moderation), normal owners only their own
  if (
    listing.ownerId.toString() !== req.user!.userId &&
    req.user!.role !== 'admin'
  ) {
    res.status(403).json({ success: false, message: 'You can only edit your own listings' })
    return
  }

  const b = coerceListingBody(req.body as Record<string, unknown>)

  // Only patch fields that were actually sent — undefined means "leave as is"
  if (b.title !== undefined) listing.title = b.title
  if (b.description !== undefined) listing.description = b.description
  if (b.price !== undefined) listing.price = b.price
  if (b.negotiable !== undefined) listing.negotiable = b.negotiable
  if (b.isAvailable !== undefined) listing.isAvailable = b.isAvailable
  if (b.amenities.length > 0) listing.amenities = b.amenities
  if (b.videoUrl !== undefined) listing.videoUrl = b.videoUrl

  if (b.address || b.area || b.district || b.lat !== undefined || b.lng !== undefined) {
    listing.location = {
      address: b.address ?? listing.location.address,
      area: b.area ?? listing.location.area,
      district: b.district ?? listing.location.district,
      coordinates: {
        type: 'Point',
        coordinates: [
          b.lng ?? listing.location.coordinates.coordinates[0],
          b.lat ?? listing.location.coordinates.coordinates[1],
        ],
      },
    }
  }

  // typeFields can only be re-validated if `type` stays the same.
  // Changing listing type after creation is not allowed — would invalidate every existing field.
  if (b.typeFields !== undefined) {
    const tfResult = validateTypeFields(listing.type, b.typeFields)
    if (!tfResult.valid) {
      res.status(400).json({ success: false, message: `typeFields invalid: ${tfResult.error}` })
      return
    }
    listing.typeFields = tfResult.data
  }

  await listing.save()
  res.json({ success: true, data: listing })
})

/* -------------------------------------------------------------------------- */
/*  DELETE /api/listings/:id   (owner-only, own listing)                      */
/* -------------------------------------------------------------------------- */

export const deleteListing = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid listing id' })
    return
  }

  const listing = await Listing.findById(id)
  if (!listing) {
    res.status(404).json({ success: false, message: 'Listing not found' })
    return
  }

  if (
    listing.ownerId.toString() !== req.user!.userId &&
    req.user!.role !== 'admin'
  ) {
    res.status(403).json({ success: false, message: 'You can only delete your own listings' })
    return
  }

  // Snapshot the URLs before we drop the doc — we still need them to clean up
  // Cloudinary. Fire-and-forget after DB delete so a Cloudinary hiccup can't
  // prevent the user-visible operation from succeeding.
  const imageUrls = [...listing.images]
  const videoUrl = listing.videoUrl

  await listing.deleteOne()

  void deleteManyFromCloudinary([...imageUrls, videoUrl])

  res.json({ success: true, message: 'Listing deleted' })
})

/* -------------------------------------------------------------------------- */
/*  POST /api/listings/:id/wishlist   (any authenticated user — toggle)       */
/* -------------------------------------------------------------------------- */

export const toggleWishlist = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid listing id' })
    return
  }

  const userId = new mongoose.Types.ObjectId(req.user!.userId)
  const listing = await Listing.findById(id)
  if (!listing) {
    res.status(404).json({ success: false, message: 'Listing not found' })
    return
  }

  const idx = listing.wishlistedBy.findIndex((u) => u.toString() === userId.toString())
  let action: 'added' | 'removed'
  if (idx === -1) {
    listing.wishlistedBy.push(userId)
    action = 'added'
  } else {
    listing.wishlistedBy.splice(idx, 1)
    action = 'removed'
  }

  await listing.save()
  res.json({ success: true, data: { action, count: listing.wishlistedBy.length } })
})

/* -------------------------------------------------------------------------- */
/*  POST /api/listings/:id/images   (owner-only)                              */
/*  Append uploaded files to the listing's images array. multipart/form-data. */
/* -------------------------------------------------------------------------- */

export const addListingImages = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid listing id' })
    return
  }

  const listing = await Listing.findById(id)
  if (!listing) {
    res.status(404).json({ success: false, message: 'Listing not found' })
    return
  }

  if (
    listing.ownerId.toString() !== req.user!.userId &&
    req.user!.role !== 'admin'
  ) {
    res.status(403).json({ success: false, message: 'You can only edit your own listings' })
    return
  }

  const files = (req.files as Express.Multer.File[] | undefined) ?? []
  if (files.length === 0) {
    res.status(400).json({ success: false, message: 'No images uploaded' })
    return
  }

  if (listing.images.length + files.length > 10) {
    res.status(400).json({
      success: false,
      message: `Cannot exceed 10 images (this listing has ${listing.images.length})`,
    })
    return
  }

  const newUrls = await Promise.all(
    files.map((f) => uploadToCloudinary(f, 'baskhoj/listings'))
  )
  listing.images.push(...newUrls)
  await listing.save()

  res.status(201).json({ success: true, data: listing })
})

/* -------------------------------------------------------------------------- */
/*  DELETE /api/listings/:id/images?url=...   (owner-only)                    */
/*  Remove a single image by its Cloudinary URL.                              */
/* -------------------------------------------------------------------------- */

export const deleteListingImage = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const url = req.query.url as string | undefined

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid listing id' })
    return
  }
  if (!url) {
    res.status(400).json({ success: false, message: '`url` query param is required' })
    return
  }

  const listing = await Listing.findById(id)
  if (!listing) {
    res.status(404).json({ success: false, message: 'Listing not found' })
    return
  }

  if (
    listing.ownerId.toString() !== req.user!.userId &&
    req.user!.role !== 'admin'
  ) {
    res.status(403).json({ success: false, message: 'You can only edit your own listings' })
    return
  }

  const beforeCount = listing.images.length
  listing.images = listing.images.filter((u) => u !== url)

  if (listing.images.length === beforeCount) {
    res.status(404).json({ success: false, message: 'That image is not on this listing' })
    return
  }

  await listing.save()

  // Fire-and-forget Cloudinary cleanup — the user already saw success
  void deleteFromCloudinary(url)

  res.json({ success: true, data: listing })
})

/* -------------------------------------------------------------------------- */
/*  POST /api/listings/:id/report   (any authenticated user)                  */
/*  Flags a listing for admin review — admin can see these via /api/admin.   */
/* -------------------------------------------------------------------------- */

export const reportListing = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const { reason } = req.body as { reason?: string }

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid listing id' })
    return
  }
  if (!reason || reason.trim().length < 5) {
    res.status(400).json({ success: false, message: 'Reason must be at least 5 characters' })
    return
  }

  const listing = await Listing.findById(id)
  if (!listing) {
    res.status(404).json({ success: false, message: 'Listing not found' })
    return
  }

  // Can't report your own listing — would just be noise for admins
  if (listing.ownerId.toString() === req.user!.userId) {
    res.status(400).json({ success: false, message: 'You cannot report your own listing' })
    return
  }

  // One report per (user, listing) — prevents spam-flagging the same listing repeatedly
  const userObjectId = new mongoose.Types.ObjectId(req.user!.userId)
  const alreadyReported = listing.reports.some(
    (r) => r.userId.toString() === userObjectId.toString()
  )
  if (alreadyReported) {
    res.status(409).json({ success: false, message: 'You have already reported this listing' })
    return
  }

  listing.reports.push({
    userId: userObjectId,
    reason: reason.trim(),
    createdAt: new Date(),
  })
  await listing.save()

  res.status(201).json({
    success: true,
    message: 'Report submitted — an admin will review this listing',
  })
})
