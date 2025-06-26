const express = require('express');
const router = express.Router();
const leadController = require('../controllers/lead.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/admin.middleware');

// Public route for submitting leads
router.post('/', leadController.submitLead);

// Protected routes for admin/staff
router.get('/', authMiddleware, isAdmin, leadController.getAllLeads);
router.get('/stats', authMiddleware, isAdmin, leadController.getLeadStats);
router.get('/:id', authMiddleware, isAdmin, leadController.getLeadById);
router.put('/:id', authMiddleware, isAdmin, leadController.updateLeadStatus);
router.delete('/:id', authMiddleware, isAdmin, leadController.deleteLead);

module.exports = router; 