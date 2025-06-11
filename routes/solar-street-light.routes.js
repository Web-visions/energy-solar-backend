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

// Public routes
router.get('/', getAllSolarStreetLights);
router.get('/:id', getSolarStreetLight);

// Protected routes (admin only)
router.post('/',authMiddleware, uploadSingle('image'), createSolarStreetLight);
router.put('/:id', authMiddleware, uploadSingle('image'), updateSolarStreetLight);
router.delete('/:id',authMiddleware, deleteSolarStreetLight);

module.exports = router;