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

// Public routes
router.get('/', getAllSolarPCUs);
router.get('/:id', getSolarPCU);

// Protected routes (admin only)
router.post('/', authMiddleware, uploadSingle('image'), createSolarPCU);
router.put('/:id',authMiddleware, uploadSingle('image'), updateSolarPCU);
router.delete('/:id', authMiddleware, deleteSolarPCU);

module.exports = router;