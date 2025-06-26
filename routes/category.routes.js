const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  // toggleCategoryStatus,
  deleteCategory
} = require('../controllers/category.controller');
const { isAdmin } = require('../middlewares/admin.middleware');

// Public routes
router.get('/', getCategories);
router.get('/:id', getCategory);

// Protected routes (admin only)
router.post('/', authMiddleware, isAdmin, createCategory);
router.put('/:id', authMiddleware, isAdmin, updateCategory);
// router.put('/:id/status', authMiddleware , toggleCategoryStatus);
router.delete('/:id', authMiddleware, isAdmin, deleteCategory);

module.exports = router;