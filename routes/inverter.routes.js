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

// Public routes
router.get('/', getAllInverters);
router.get('/:id', getInverter);

// Protected routes (admin only)
router.post('/', authMiddleware, uploadSingle('image'), createInverter);
router.put('/:id', authMiddleware, uploadSingle('image'), updateInverter);
router.delete('/:id', authMiddleware, deleteInverter);

module.exports = router;