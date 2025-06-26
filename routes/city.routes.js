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
const { isAdmin } = require('../middlewares/admin.middleware');

// Public routes
router.get('/active', getActiveCities);
router.get('/', authMiddleware, isAdmin, getCities);
router.get('/:id', getCity);

// Protected routes (admin only)
router.post('/', authMiddleware, isAdmin, createCity);
router.put('/:id', authMiddleware, isAdmin, updateCity);
router.put('/:id/status', authMiddleware, isAdmin, toggleCityStatus);
router.delete('/:id', authMiddleware, isAdmin, deleteCity);

module.exports = router;