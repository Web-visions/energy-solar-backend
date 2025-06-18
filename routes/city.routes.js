const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware')

const {
  getCities,
  getCity,
  createCity,
  updateCity,
  toggleCityStatus,
  deleteCity,
  getActiveCities,
  getAllCities
} = require('../controllers/city.controller');

// Public routes
router.get('/active', getActiveCities);
router.get('/', getCities);
router.get('/:id', getCity);

// Protected routes (admin only)
router.post('/', authMiddleware, createCity);
router.put('/:id', authMiddleware, updateCity);
router.put('/:id/status', authMiddleware, toggleCityStatus);
router.delete('/:id', authMiddleware, deleteCity);

module.exports = router;