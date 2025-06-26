const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brand.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { uploadSingle } = require('../middlewares/upload.middleware');
const { isAdmin } = require('../middlewares/admin.middleware');

// Public routes
router.get('/', brandController.getBrands);
router.get('/:id', brandController.getBrand);



// Admin only routes
router.post('/', authMiddleware, isAdmin, uploadSingle('logo'), brandController.createBrand);
router.put('/:id', authMiddleware, isAdmin, uploadSingle('logo'), brandController.updateBrand);
router.put('/:id/status', authMiddleware, isAdmin, brandController.toggleBrandStatus);
router.delete('/:id', authMiddleware, isAdmin, brandController.deleteBrand);

module.exports = router;