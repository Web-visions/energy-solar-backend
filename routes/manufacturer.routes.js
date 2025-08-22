// routes/manufacturerRoutes.js
const express = require('express');
const router = express.Router();
const {
    createManufacturer,
    getManufacturerById,
    getAllManufacturers,
    updateManufacturer
} = require('../controllers/manufacturer.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/admin.middleware');

router.post('/', authMiddleware, isAdmin, createManufacturer);
router.get('/', getAllManufacturers);
router.get('/:id', getManufacturerById);
router.put('/:id', authMiddleware, isAdmin, updateManufacturer);

module.exports = router;
