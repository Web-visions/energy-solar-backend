const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brand.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { uploadSingle } = require('../middlewares/upload.middleware');

// Public routes
router.get('/', brandController.getBrands);
router.get('/:id', brandController.getBrand);

// Protected routes - require authentication
router.use(authMiddleware);

// Admin only routes
router.post('/', uploadSingle('logo'), brandController.createBrand);
router.put('/:id', uploadSingle('logo'), brandController.updateBrand);
router.put('/:id/status', brandController.toggleBrandStatus);
router.delete('/:id', brandController.deleteBrand);

module.exports = router;