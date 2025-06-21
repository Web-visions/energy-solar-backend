const express = require('express');
const { getRazorpayKey, createOrder, verifyPayment } = require('../controllers/payment.controller.js')
const authMiddleware = require('../middlewares/auth.middleware.js')

const router = express.Router();

// @route   GET /api/payment/key
// @desc    Get Razorpay key
// @access  Private
router.get('/key', authMiddleware, getRazorpayKey);

// @route   POST /api/payment/order
// @desc    Create a Razorpay order
// @access  Private
router.post('/order', authMiddleware, createOrder);

// @route   POST /api/payment/verify
// @desc    Verify payment and create order in DB
// @access  Private
router.post('/verify', authMiddleware, verifyPayment);

module.exports = router; 