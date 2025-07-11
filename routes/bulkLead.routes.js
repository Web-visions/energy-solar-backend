const express = require('express');
const router = express.Router();
const bulkLeadController = require('../controllers/bulkLead.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/admin.middleware');

// Public route for submitting bulk lead
router.post('/', bulkLeadController.submitBulkLead);

// Admin route for viewing all bulk leads
router.get('/', authMiddleware, isAdmin, bulkLeadController.getAllBulkLeads);

module.exports = router; 