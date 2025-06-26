const express = require('express');
const router = express.Router();
const {
  getAllInverters,
  getInverter,
  createInverter,
  updateInverter,
  deleteInverter
} = require('../controllers/inverter.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { uploadSingle } = require('../middlewares/upload.middleware');
const { isAdmin } = require('../middlewares/admin.middleware');

// Public routes
router.get('/', getAllInverters);
router.get('/:id', getInverter);

// Protected routes (admin only)
router.post('/', authMiddleware, isAdmin, uploadSingle('image'), createInverter);
router.put('/:id', authMiddleware, isAdmin, uploadSingle('image'), updateInverter);
router.delete('/:id', authMiddleware, isAdmin, deleteInverter);

module.exports = router;