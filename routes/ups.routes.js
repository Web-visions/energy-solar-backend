const express = require('express');
const router = express.Router();
const {
  getAllUPS,
  getUPS,
  createUPS,
  updateUPS,
  deleteUPS
} = require('../controllers/ups.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { uploadSingle } = require('../middlewares/upload.middleware');
const { isAdmin } = require('../middlewares/admin.middleware');

// Public routes
router.get('/', getAllUPS);
router.get('/:id', getUPS);

// Protected routes (admin only)
router.post('/', authMiddleware, isAdmin, uploadSingle('image'), createUPS);
router.put('/:id', authMiddleware, isAdmin, uploadSingle('image'), updateUPS);
router.delete('/:id', authMiddleware, isAdmin, deleteUPS);

module.exports = router;