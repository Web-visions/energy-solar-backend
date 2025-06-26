const express = require('express');
const router = express.Router();
const batteryController = require('../controllers/battery.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { uploadSingle } = require('../middlewares/upload.middleware');
const { isAdmin } = require('../middlewares/admin.middleware');
// GET all batteries with filter, search, pagination
router.get('/', batteryController.getAllBatteries);

// GET single battery
router.get('/:id', batteryController.getBattery);

// CREATE battery (with image upload)
router.post('/', authMiddleware, uploadSingle('image'), isAdmin, batteryController.createBattery);

// UPDATE battery (with image upload)
router.put('/:id', authMiddleware, uploadSingle('image'), isAdmin, batteryController.updateBattery);

// TOGGLE status
router.put('/:id/status', authMiddleware, isAdmin, batteryController.toggleBatteryStatus);

// DELETE battery
router.delete('/:id', authMiddleware, isAdmin, batteryController.deleteBattery);

module.exports = router;
