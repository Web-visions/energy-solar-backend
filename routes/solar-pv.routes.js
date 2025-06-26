const express = require('express');
const router = express.Router();
const {
  getAllSolarPVModules,
  getSolarPVModule,
  createSolarPVModule,
  updateSolarPVModule,
  deleteSolarPVModule
} = require('../controllers/solar-pv.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { uploadMultiple } = require('../middlewares/upload.middleware');
const { isAdmin } = require('../middlewares/admin.middleware');

// Public routes
router.get('/', getAllSolarPVModules);
router.get('/:id', getSolarPVModule);

// Protected routes (admin only)
router.post('/', authMiddleware, isAdmin, uploadMultiple('images', 5), createSolarPVModule);
router.put('/:id', authMiddleware, isAdmin, uploadMultiple('images', 5), updateSolarPVModule);
router.delete('/:id', authMiddleware, isAdmin, deleteSolarPVModule);

module.exports = router;