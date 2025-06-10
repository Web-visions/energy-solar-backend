const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const productController = require('../controllers/product.controller');

// Public routes
router.get('/', productController.getProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/:id', productController.getProduct);
router.get('/:id/related', productController.getRelatedProducts);

// Protected routes (Admin only)
router.post('/', authMiddleware, productController.createProduct);
router.put('/:id', authMiddleware,productController.updateProduct);
router.put('/:id/status', authMiddleware,  productController.toggleProductStatus);
router.put('/:id/featured', authMiddleware, productController.toggleProductFeatured);
router.delete('/:id', authMiddleware,  productController.deleteProduct);

module.exports = router;