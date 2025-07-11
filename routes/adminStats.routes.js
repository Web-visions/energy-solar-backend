const express = require('express');
const router = express.Router();
const adminStatsController = require('../controllers/adminStats.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/admin.middleware');

router.get('/', authMiddleware, isAdmin, adminStatsController.getAllStats);
router.get('/orders-graph', authMiddleware, isAdmin, adminStatsController.getOrderGraph);

module.exports = router; 