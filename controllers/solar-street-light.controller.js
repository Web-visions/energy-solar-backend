const SolarStreetLight = require('../models/solor-street-light.model');
const mongoose = require('mongoose');
const fileUpload = require('../utils/fileUpload');

// @desc    Get all Solar Street Lights with pagination, search, and filtering
// @route   GET /api/solar-street-lights
// @access  Public
exports.getAllSolarStreetLights = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const search = req.query.search || '';

    // Create base query
    const query = {};

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { modelName: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter by brand
    if (req.query.brand) {
      query.brand = { $regex: req.query.brand, $options: 'i' };
    }

    // Filter by power range
    if (req.query.minPower || req.query.maxPower) {
      query.power = {};
      if (req.query.minPower) query.power.$gte = Number(req.query.minPower);
      if (req.query.maxPower) query.power.$lte = Number(req.query.maxPower);
    }

    // Get total count with filters applied
    const total = await SolarStreetLight.countDocuments(query);

    // Sorting
    let sortOption = {};
    if (req.query.sortBy) {
      const sortField = req.query.sortBy;
      const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
      sortOption[sortField] = sortOrder;
    } else {
      // Default sort by createdAt desc
      sortOption = { createdAt: -1 };
    }

    // Query with pagination, filtering, and sorting
    const solarStreetLights = await SolarStreetLight.find(query)
      .populate('category', 'name')
      // .populate('reviews')
      .sort(sortOption)
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: solarStreetLights.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: solarStreetLights
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Get single Solar Street Light
// @route   GET /api/solar-street-lights/:id
// @access  Public
exports.getSolarStreetLight = async (req, res) => {
  try {
    const solarStreetLight = await SolarStreetLight.findById(req.params.id)
      .populate('category', 'name')
    // .populate('reviews');

    if (!solarStreetLight) {
      return res.status(404).json({
        success: false,
        message: 'Solar Street Light not found'
      });
    }

    res.status(200).json({
      success: true,
      data: solarStreetLight
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Create new Solar Street Light
// @route   POST /api/solar-street-lights
// @access  Private/Admin
exports.createSolarStreetLight = async (req, res) => {
  try {
    const {
      category,
      name,
      description,
      brand,
      modelName,
      power,
      replacementPolicy,
      staticTags,
      price,
      isFeatured
    } = req.body;

    // Validate required fields
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    if (!price || price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid price is required'
      });
    }

    // Check if Solar Street Light with this name already exists
    const existingSolarStreetLight = await SolarStreetLight.findOne({ name });
    if (existingSolarStreetLight) {
      return res.status(400).json({
        success: false,
        message: `Solar Street Light with name ${name} already exists`
      });
    }

    // Handle image upload if file is provided
    let imagePath = null;
    if (req.file) {
      imagePath = await fileUpload.saveFile(req.file);
    }

    // Create Solar Street Light
    const solarStreetLight = await SolarStreetLight.create({
      category,
      name,
      description,
      brand,
      modelName,
      power: power ? Number(power) : undefined,
      replacementPolicy,
      staticTags: staticTags ? JSON.parse(staticTags) : [],
      price: Number(price),
      image: imagePath,
      isFeatured: typeof isFeatured === 'string' ? isFeatured === 'true' : !!isFeatured
    });

    res.status(201).json({
      success: true,
      data: solarStreetLight
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Update Solar Street Light
// @route   PUT /api/solar-street-lights/:id
// @access  Private/Admin
exports.updateSolarStreetLight = async (req, res) => {
  try {
    let solarStreetLight = await SolarStreetLight.findById(req.params.id);

    if (!solarStreetLight) {
      return res.status(404).json({
        success: false,
        message: 'Solar Street Light not found'
      });
    }

    // Check if name is being changed and if it already exists
    if (req.body.name && req.body.name !== solarStreetLight.name) {
      const existingSolarStreetLight = await SolarStreetLight.findOne({
        name: req.body.name,
        _id: { $ne: req.params.id }
      });

      if (existingSolarStreetLight) {
        return res.status(400).json({
          success: false,
          message: `Solar Street Light with name ${req.body.name} already exists`
        });
      }
    }

    // Handle image upload if file is provided
    if (req.file) {
      const imagePath = await fileUpload.saveFile(req.file, solarStreetLight.image);
      req.body.image = imagePath;
    }

    // Parse staticTags if provided as string
    if (req.body.staticTags && typeof req.body.staticTags === 'string') {
      req.body.staticTags = JSON.parse(req.body.staticTags);
    }

    // Convert numeric fields
    if (req.body.power) req.body.power = Number(req.body.power);
    if (req.body.price) req.body.price = Number(req.body.price);

    // Update Solar Street Light
    solarStreetLight = await SolarStreetLight.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: solarStreetLight
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Delete Solar Street Light
// @route   DELETE /api/solar-street-lights/:id
// @access  Private/Admin
exports.deleteSolarStreetLight = async (req, res) => {
  try {
    const solarStreetLight = await SolarStreetLight.findById(req.params.id);

    if (!solarStreetLight) {
      return res.status(404).json({
        success: false,
        message: 'Solar Street Light not found'
      });
    }

    // Remove from all user carts before deleting
    const { removeProductFromAllCarts } = require('./cart.controller');
    await removeProductFromAllCarts('solar-street-light', req.params.id);

    // Delete image if exists
    if (solarStreetLight.image) {
      await fileUpload.deleteFile(solarStreetLight.image);
    }

    await SolarStreetLight.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {},
      message: 'Solar Street Light deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};