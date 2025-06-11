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

// Public routes
router.get('/', getCategories);
router.get('/:id', getCategory);

// Protected routes (admin only)
router.post('/', authMiddleware, createCategory);
router.put('/:id', authMiddleware,  updateCategory);
// router.put('/:id/status', authMiddleware , toggleCategoryStatus);
router.delete('/:id', authMiddleware, deleteCategory);

module.exports = router;