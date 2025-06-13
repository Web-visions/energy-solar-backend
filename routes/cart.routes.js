const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// All cart routes require authentication
router.use(authMiddleware);

// Get cart
router.get('/', cartController.getCart);

// Add item to cart
router.post('/add', cartController.addToCart);

// Update cart item quantity
router.put('/:productType/:productId', cartController.updateCartItem);

// Remove item from cart
router.delete('/:productType/:productId', cartController.removeFromCart);

module.exports = router; 