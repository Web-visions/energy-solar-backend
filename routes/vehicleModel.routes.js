// routes/vehicleModelRoutes.js
const express = require('express');
const router = express.Router();
const {
    createVehicleModel,
    getVehicleModelById,
    getAllVehicleModels,
    getVehicleModelsByManufacturer,
    updateVehicleModel
} = require('../controllers/vehicleModel.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/admin.middleware');

router.post('/', authMiddleware, isAdmin, createVehicleModel);
router.get('/', getAllVehicleModels);
router.get('/:id', getVehicleModelById);
router.get('/manufacturer/:manufacturerId', getVehicleModelsByManufacturer);
router.put('/:id', authMiddleware, isAdmin, updateVehicleModel);

module.exports = router;
