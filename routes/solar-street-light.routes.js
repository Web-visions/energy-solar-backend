const express = require('express');
const router = express.Router();
const {
  getAllSolarStreetLights,
  getSolarStreetLight,
  createSolarStreetLight,
  updateSolarStreetLight,
  deleteSolarStreetLight
} = require('../controllers/solar-street-light.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { uploadSingle } = require('../middlewares/upload.middleware');
const { isAdmin } = require('../middlewares/admin.middleware');

// Public routes
router.get('/', getAllSolarStreetLights);
router.get('/:id', getSolarStreetLight);

// Protected routes (admin only)
router.post('/', authMiddleware, isAdmin, uploadSingle('image'), createSolarStreetLight);
router.put('/:id', authMiddleware, isAdmin, uploadSingle('image'), updateSolarStreetLight);
router.delete('/:id', authMiddleware, isAdmin, deleteSolarStreetLight);

module.exports = router;