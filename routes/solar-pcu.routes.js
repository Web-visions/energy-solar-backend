const express = require('express');
const router = express.Router();
const {
  getAllSolarPCUs,
  getSolarPCU,
  createSolarPCU,
  updateSolarPCU,
  deleteSolarPCU
} = require('../controllers/solar-pcu.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { uploadSingle } = require('../middlewares/upload.middleware');
const { isAdmin } = require('../middlewares/admin.middleware');

// Public routes
router.get('/', getAllSolarPCUs);
router.get('/:id', getSolarPCU);

// Protected routes (admin only)
router.post('/', authMiddleware, isAdmin, uploadSingle('image'), createSolarPCU);
router.put('/:id', authMiddleware, isAdmin, uploadSingle('image'), updateSolarPCU);
router.delete('/:id', authMiddleware, isAdmin, deleteSolarPCU);

module.exports = router;