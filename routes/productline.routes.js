// routes/productLineRoutes.js
const express = require('express');
const router = express.Router();
const {
    createProductLine,
    getProductLineById,
    getAllProductLines,
    updateProductLine
} = require('../controllers/productLine.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/admin.middleware');

// Routes
router.post('/', authMiddleware, isAdmin, createProductLine);
router.get('/', getAllProductLines);
router.get('/:id', getProductLineById);
router.put('/:id', authMiddleware, isAdmin, updateProductLine);

module.exports = router;
