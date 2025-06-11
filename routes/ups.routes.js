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

// Public routes
router.get('/', getAllUPS);
router.get('/:id', getUPS);

// Protected routes (admin only)
router.post('/', authMiddleware, uploadSingle('image'), createUPS);
router.put('/:id', authMiddleware,  uploadSingle('image'), updateUPS);
router.delete('/:id', authMiddleware, deleteUPS);

module.exports = router;