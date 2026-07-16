import { Router } from 'express'
import { createReview, listReviewsForListing } from '../controllers/review.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const router = Router()

// Public — anyone can read reviews for a listing
router.get('/listing/:listingId', listReviewsForListing)

// Protected — only authenticated users can submit reviews
router.post('/', authMiddleware, createReview)

export default router
