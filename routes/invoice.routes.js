const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoice.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Generate and download invoice
router.get('/:orderId/download', authMiddleware, invoiceController.generateInvoice);

// Get invoice data (for frontend display)
router.get('/:orderId', authMiddleware, invoiceController.getInvoiceData);

module.exports = router; 