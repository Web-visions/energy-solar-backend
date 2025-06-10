const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brand.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Public routes
router.get('/', brandController.getBrands);
router.get('/:id', brandController.getBrand);

// Protected routes - require authentication
router.use(authMiddleware);

// Admin only routes
router.post('/', brandController.createBrand);
router.put('/:id', brandController.updateBrand);
router.put('/:id/status', brandController.toggleBrandStatus);
router.delete('/:id', brandController.deleteBrand);

module.exports = router;