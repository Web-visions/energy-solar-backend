// controllers/manufacturerController.js
const Manufacturer = require('../models/manufacturer.model');

// Create Manufacturer
exports.createManufacturer = async (req, res) => {
    try {
        const { name } = req.body;

        // Validation
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a manufacturer name'
            });
        }

        // Validate name length
        if (name.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Manufacturer name must be at least 2 characters'
            });
        }

        // Check if manufacturer already exists
        let existingManufacturer = await Manufacturer.findOne({ name: name.trim() });
        if (existingManufacturer) {
            return res.status(400).json({
                success: false,
                message: 'Manufacturer with this name already exists'
            });
        }

        // Create manufacturer with validated fields
        const manufacturerData = {
            name: name.trim()
        };

        const manufacturer = await Manufacturer.create(manufacturerData);

        res.status(201).json({
            success: true,
            message: 'Manufacturer created successfully',
            manufacturer
        });

    } catch (error) {
        console.error(error);

        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Manufacturer with this name already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// Get Manufacturer by ID
exports.getManufacturerById = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid manufacturer ID'
            });
        }

        const manufacturer = await Manufacturer.findById(id);

        if (!manufacturer) {
            return res.status(404).json({
                success: false,
                message: 'Manufacturer not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Manufacturer retrieved successfully',
            manufacturer
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// Get All Manufacturers
exports.getAllManufacturers = async (req, res) => {
    try {
        const manufacturers = await Manufacturer.find().sort({ name: 1 });

        res.status(200).json({
            success: true,
            message: 'Manufacturers retrieved successfully',
            count: manufacturers.length,
            manufacturers
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// Update Manufacturer
exports.updateManufacturer = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        // Validate ObjectId
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid manufacturer ID'
            });
        }

        // Validation
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a manufacturer name'
            });
        }

        // Validate name length
        if (name.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Manufacturer name must be at least 2 characters'
            });
        }

        // Check if manufacturer exists
        let manufacturer = await Manufacturer.findById(id);
        if (!manufacturer) {
            return res.status(404).json({
                success: false,
                message: 'Manufacturer not found'
            });
        }

        // Check if another manufacturer with same name exists (excluding current one)
        const existingManufacturer = await Manufacturer.findOne({
            name: name.trim(),
            _id: { $ne: id }
        });

        if (existingManufacturer) {
            return res.status(400).json({
                success: false,
                message: 'Manufacturer with this name already exists'
            });
        }

        // Update manufacturer
        const updatedData = {
            name: name.trim()
        };

        manufacturer = await Manufacturer.findByIdAndUpdate(
            id,
            updatedData,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Manufacturer updated successfully',
            manufacturer
        });

    } catch (error) {
        console.error(error);

        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Manufacturer with this name already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};
