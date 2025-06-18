const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middlewares/auth.middleware');
const { uploadMultiple } = require('../middlewares/upload.middleware');
const {
    createReview,
    getProductReviews,
    updateReview,
    deleteReview,
    getUserReviews
} = require('../controllers/review.controller');

// Create a new review
router.post('/', isAuthenticated, uploadMultiple('images', 5), createReview);

// Get reviews for a product
router.get('/product/:productId', getProductReviews);

// Get user's reviews
router.get('/user', isAuthenticated, getUserReviews);

// Update a review
router.put('/:reviewId', isAuthenticated, uploadMultiple('images', 5), updateReview);

// Delete a review
router.delete('/:reviewId', isAuthenticated, deleteReview);

module.exports = router; 