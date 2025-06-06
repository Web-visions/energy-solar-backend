const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyEmail } = require('../middlewares/auth.middleware');
const authMiddleware = require('../middlewares/auth.middleware');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.put('/reset-password/:resettoken', authController.resetPassword);

// Protected routes
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.getMe);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-otp', authMiddleware, authController.resendOTP);
router.put('/change-password', authMiddleware, authController.changePassword);

module.exports = router;