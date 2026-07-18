import { Router } from 'express'
import {
  createListing,
  listListings,
  getListing,
  updateListing,
  deleteListing,
  toggleWishlist,
  myListings,
  compareListings,
  reportListing,
  addListingImages,
  deleteListingImage,
  wishlistListings,
} from '../controllers/listing.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'
import { requireMfaForPrivileged } from '../middleware/mfa.middleware'
import { upload } from '../middleware/upload.middleware'
import { generalLimiter, writeLimiter } from '../utils/rateLimit'

const router = Router()

// Baseline per-IP cap for all listing traffic (reads included). Mutations layer a
// tighter writeLimiter on top.
router.use(generalLimiter)

/**
 * IMPORTANT: more specific routes must come BEFORE the parameterized /:id route.
 * Otherwise Express would treat "compare" or "owner" as an :id and 400.
 */

// ---- Specific paths ----
router.get('/compare', compareListings)
router.get('/wishlist', authMiddleware, wishlistListings)
router.get('/owner/my-listings', authMiddleware, requireRole('owner', 'admin'), myListings)

// ---- Public list & detail ----
router.get('/', listListings)
router.get('/:id', getListing)

// ---- Owner-only writes ----
// `upload.array('images', 10)` parses multipart/form-data with up to 10 image files
// in the field named "images". Other text fields land in req.body as strings.
router.post(
  '/',
  writeLimiter,
  authMiddleware,
  requireRole('owner', 'admin'),
  requireMfaForPrivileged,
  upload.array('images', 10),
  createListing
)

router.put(
  '/:id',
  writeLimiter,
  authMiddleware,
  requireRole('owner', 'admin'),
  requireMfaForPrivileged,
  // PUT updates text fields only (JSON body). Image add/remove use the dedicated
  // endpoints below to keep the body shape predictable.
  updateListing
)

router.delete(
  '/:id',
  authMiddleware,
  requireRole('owner', 'admin'),
  requireMfaForPrivileged,
  deleteListing
)

// ---- Image management (owner-only) ----
// Append: multipart upload via multer, capped at 10 total images per listing
router.post(
  '/:id/images',
  authMiddleware,
  requireRole('owner', 'admin'),
  requireMfaForPrivileged,
  upload.array('images', 10),
  addListingImages
)

// Remove a specific image by its full Cloudinary URL
router.delete(
  '/:id/images',
  authMiddleware,
  requireRole('owner', 'admin'),
  requireMfaForPrivileged,
  deleteListingImage
)

// ---- Authenticated user actions ----
router.post('/:id/wishlist', authMiddleware, toggleWishlist)
router.post('/:id/report', authMiddleware, reportListing)

export default router
