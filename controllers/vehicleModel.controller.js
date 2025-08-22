// controllers/vehicleModelController.js
const VehicleModel = require('../models/vehicleModel');
const Manufacturer = require('../models/manufacturer.model');

// Create VehicleModel
exports.createVehicleModel = async (req, res) => {
    try {
        const { name, manufacturer } = req.body;

        // Validation
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a vehicle model name'
            });
        }

        if (!manufacturer) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a manufacturer'
            });
        }

        // Validate name length
        if (name.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Vehicle model name must be at least 2 characters'
            });
        }

        // Validate ObjectId for manufacturer
        if (!manufacturer.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid manufacturer ID'
            });
        }

        // Check if manufacturer exists
        const manufacturerExists = await Manufacturer.findById(manufacturer);
        if (!manufacturerExists) {
            return res.status(400).json({
                success: false,
                message: 'Manufacturer not found'
            });
        }

        // Check if vehicle model already exists for this manufacturer
        let existingModel = await VehicleModel.findOne({
            name: name.trim(),
            manufacturer: manufacturer
        });
        if (existingModel) {
            return res.status(400).json({
                success: false,
                message: 'Vehicle model with this name already exists for this manufacturer'
            });
        }

        // Create vehicle model with validated fields
        const vehicleModelData = {
            name: name.trim(),
            manufacturer
        };

        const vehicleModel = await VehicleModel.create(vehicleModelData);

        // Populate manufacturer for response
        await vehicleModel.populate('manufacturer', 'name');

        res.status(201).json({
            success: true,
            message: 'Vehicle model created successfully',
            vehicleModel
        });

    } catch (error) {
        console.error(error);

        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Vehicle model with this name already exists for this manufacturer'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// Get VehicleModel by ID
exports.getVehicleModelById = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid vehicle model ID'
            });
        }

        const vehicleModel = await VehicleModel.findById(id)
            .populate('manufacturer', 'name');

        if (!vehicleModel) {
            return res.status(404).json({
                success: false,
                message: 'Vehicle model not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Vehicle model retrieved successfully',
            vehicleModel
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// Get All VehicleModels
exports.getAllVehicleModels = async (req, res) => {
    try {
        const { manufacturer } = req.query;
        let filter = {};

        // Filter by manufacturer if provided
        if (manufacturer) {
            filter.manufacturer = manufacturer;
        }

        const vehicleModels = await VehicleModel.find(filter)
            .populate('manufacturer', 'name')
            .sort({ name: 1 });

        res.status(200).json({
            success: true,
            message: 'Vehicle models retrieved successfully',
            count: vehicleModels.length,
            vehicleModels
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// Get VehicleModels by Manufacturer
exports.getVehicleModelsByManufacturer = async (req, res) => {
    try {
        const { manufacturerId } = req.params;

        // Validate ObjectId
        if (!manufacturerId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid manufacturer ID'
            });
        }

        // Check if manufacturer exists
        const manufacturer = await Manufacturer.findById(manufacturerId);
        if (!manufacturer) {
            return res.status(404).json({
                success: false,
                message: 'Manufacturer not found'
            });
        }

        const vehicleModels = await VehicleModel.find({ manufacturer: manufacturerId })
            .populate('manufacturer', 'name')
            .sort({ name: 1 });

        res.status(200).json({
            success: true,
            message: 'Vehicle models retrieved successfully',
            manufacturer: manufacturer.name,
            count: vehicleModels.length,
            vehicleModels
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// Update VehicleModel
exports.updateVehicleModel = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, manufacturer } = req.body;

        // Validate ObjectId
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid vehicle model ID'
            });
        }

        // Validation
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a vehicle model name'
            });
        }

        if (!manufacturer) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a manufacturer'
            });
        }

        // Validate name length
        if (name.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Vehicle model name must be at least 2 characters'
            });
        }

        // Validate ObjectId for manufacturer
        if (!manufacturer.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid manufacturer ID'
            });
        }

        // Check if vehicle model exists
        let vehicleModel = await VehicleModel.findById(id);
        if (!vehicleModel) {
            return res.status(404).json({
                success: false,
                message: 'Vehicle model not found'
            });
        }

        // Check if manufacturer exists
        const manufacturerExists = await Manufacturer.findById(manufacturer);
        if (!manufacturerExists) {
            return res.status(400).json({
                success: false,
                message: 'Manufacturer not found'
            });
        }

        // Check if another vehicle model with same name and manufacturer exists (excluding current one)
        const existingModel = await VehicleModel.findOne({
            name: name.trim(),
            manufacturer: manufacturer,
            _id: { $ne: id }
        });

        if (existingModel) {
            return res.status(400).json({
                success: false,
                message: 'Vehicle model with this name already exists for this manufacturer'
            });
        }

        // Update vehicle model
        const updatedData = {
            name: name.trim(),
            manufacturer
        };

        vehicleModel = await VehicleModel.findByIdAndUpdate(
            id,
            updatedData,
            { new: true, runValidators: true }
        ).populate('manufacturer', 'name');

        res.status(200).json({
            success: true,
            message: 'Vehicle model updated successfully',
            vehicleModel
        });

    } catch (error) {
        console.error(error);

        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Vehicle model with this name already exists for this manufacturer'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};
