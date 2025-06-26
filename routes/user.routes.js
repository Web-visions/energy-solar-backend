const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/admin.middleware');

// User routes with authentication middleware
router.use(authMiddleware);

// Get all users with pagination and search
router.get('/', userController.getUsers);

// Get single user
router.get('/:id', userController.getUser);

// Create new user (admin only)
router.post('/', authMiddleware, isAdmin, userController.createUser);

// Update user
router.put('/:id', userController.updateUser);

// Toggle user status (activate/deactivate)
router.put('/:id/status', authMiddleware, isAdmin, userController.toggleUserStatus);

module.exports = router;