import { Router } from 'express'
import { createReview, listReviewsForListing } from '../controllers/review.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { generalLimiter, writeLimiter } from '../utils/rateLimit'

const router = Router()

// Per-IP cap on all review traffic (incl. public reads).
router.use(generalLimiter)

// Public — anyone can read reviews for a listing
router.get('/listing/:listingId', listReviewsForListing)

// Protected — only authenticated users can submit reviews (tighter write cap)
router.post('/', writeLimiter, authMiddleware, createReview)

export default router
