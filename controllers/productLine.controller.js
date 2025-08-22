// controllers/productLineController.js
const ProductLine = require('../models/productLine.model');

// Create ProductLine
exports.createProductLine = async (req, res) => {
    try {
        const { name } = req.body;

        // Validation
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a name'
            });
        }

        // Validate name length
        if (name.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Name must be at least 2 characters'
            });
        }

        // Check if product line already exists
        let existingProductLine = await ProductLine.findOne({ name: name.trim() });
        if (existingProductLine) {
            return res.status(400).json({
                success: false,
                message: 'Product line with this name already exists'
            });
        }

        // Create product line with validated fields
        const productLineData = {
            name: name.trim()
        };

        const productLine = await ProductLine.create(productLineData);

        res.status(201).json({
            success: true,
            message: 'Product line created successfully',
            productLine
        });

    } catch (error) {
        console.error(error);

        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Product line with this name already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// Get ProductLine by ID
exports.getProductLineById = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid product line ID'
            });
        }

        const productLine = await ProductLine.findById(id);

        if (!productLine) {
            return res.status(404).json({
                success: false,
                message: 'Product line not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Product line retrieved successfully',
            productLine
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// Get All ProductLines
exports.getAllProductLines = async (req, res) => {
    try {
        const productLines = await ProductLine.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            message: 'Product lines retrieved successfully',
            count: productLines.length,
            productLines
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// Update ProductLine
exports.updateProductLine = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        // Validate ObjectId
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid product line ID'
            });
        }

        // Validation
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a name'
            });
        }

        // Validate name length
        if (name.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Name must be at least 2 characters'
            });
        }

        // Check if product line exists
        let productLine = await ProductLine.findById(id);
        if (!productLine) {
            return res.status(404).json({
                success: false,
                message: 'Product line not found'
            });
        }

        // Check if another product line with same name exists (excluding current one)
        const existingProductLine = await ProductLine.findOne({
            name: name.trim(),
            _id: { $ne: id }
        });

        if (existingProductLine) {
            return res.status(400).json({
                success: false,
                message: 'Product line with this name already exists'
            });
        }

        // Update product line
        const updatedData = {
            name: name.trim()
        };

        productLine = await ProductLine.findByIdAndUpdate(
            id,
            updatedData,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Product line updated successfully',
            productLine
        });

    } catch (error) {
        console.error(error);

        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Product line with this name already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};
