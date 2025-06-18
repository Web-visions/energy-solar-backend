const express = require('express');
const router = express.Router();
const leadController = require('../controllers/lead.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Public route for submitting leads
router.post('/', leadController.submitLead);

// Protected routes for admin/staff
router.get('/', authMiddleware, leadController.getAllLeads);
router.get('/stats', authMiddleware, leadController.getLeadStats);
router.get('/:id', authMiddleware, leadController.getLeadById);
router.put('/:id', authMiddleware, leadController.updateLeadStatus);
router.delete('/:id', authMiddleware, leadController.deleteLead);

module.exports = router; 