const SolarPCU = require('../models/solor-pcu.model');
const mongoose = require('mongoose');
const fileUpload = require('../utils/fileUpload');

// @desc    Get all Solar PCUs with pagination, search, and filtering
// @route   GET /api/solar-pcus
// @access  Public
exports.getAllSolarPCUs = async (req, res) => {
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

    // Filter by type
    if (req.query.type) {
      query.type = req.query.type;
    }

    // Filter by wattage range
    if (req.query.minWattage || req.query.maxWattage) {
      query.wattage = {};
      if (req.query.minWattage) query.wattage.$gte = Number(req.query.minWattage);
      if (req.query.maxWattage) query.wattage.$lte = Number(req.query.maxWattage);
    }

    // Filter by weight range
    if (req.query.minWeight || req.query.maxWeight) {
      query.weight = {};
      if (req.query.minWeight) query.weight.$gte = Number(req.query.minWeight);
      if (req.query.maxWeight) query.weight.$lte = Number(req.query.maxWeight);
    }

    // Get total count with filters applied
    const total = await SolarPCU.countDocuments(query);

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
    const solarPCUs = await SolarPCU.find(query)
      .populate('category', 'name')
      .populate('productLine', 'name')
      .populate('brand', 'name')
      .sort(sortOption)
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: solarPCUs.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: solarPCUs
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Get single Solar PCU
// @route   GET /api/solar-pcus/:id
// @access  Public
exports.getSolarPCU = async (req, res) => {
  try {
    const solarPCU = await SolarPCU.findById(req.params.id)
      .populate('category', 'name')
      .populate('productLine', 'name') // <-- added

    if (!solarPCU) {
      return res.status(404).json({
        success: false,
        message: 'Solar PCU not found'
      });
    }

    res.status(200).json({
      success: true,
      data: solarPCU
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Create new Solar PCU
// @route   POST /api/solar-pcus
// @access  Private/Admin
exports.createSolarPCU = async (req, res) => {
  try {
    const {
      category,
      name,
      description,
      features,
      brand,
      type,
      wattage,
      modelName,
      staticTags,
      warranty,
      dimension,
      weight,
      price,
      isFeatured,
      productLine
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

    // Check if Solar PCU with this name already exists
    const existingSolarPCU = await SolarPCU.findOne({ name });
    if (existingSolarPCU) {
      return res.status(400).json({
        success: false,
        message: `Solar PCU with name ${name} already exists`
      });
    }

    // Handle image upload if file is provided
    let imagePath = null;
    if (req.file) {
      imagePath = await fileUpload.saveFile(req.file);
    }

    // Create Solar PCU
    const solarPCU = await SolarPCU.create({
      category,
      name,
      productLine,
      description,
      features: features ? JSON.parse(features) : [],
      brand,
      type,
      wattage: wattage ? Number(wattage) : undefined,
      modelName,
      staticTags: staticTags ? JSON.parse(staticTags) : [],
      warranty,
      dimension,
      weight: weight ? Number(weight) : undefined,
      price: Number(price),
      image: imagePath,
      isFeatured: typeof isFeatured === 'string' ? isFeatured === 'true' : !!isFeatured
    });

    res.status(201).json({
      success: true,
      data: solarPCU
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Update Solar PCU
// @route   PUT /api/solar-pcus/:id
// @access  Private/Admin
exports.updateSolarPCU = async (req, res) => {
  try {
    let solarPCU = await SolarPCU.findById(req.params.id);

    if (!solarPCU) {
      return res.status(404).json({
        success: false,
        message: 'Solar PCU not found'
      });
    }

    // Check if name is being changed and if it already exists
    if (req.body.name && req.body.name !== solarPCU.name) {
      const existingSolarPCU = await SolarPCU.findOne({
        name: req.body.name,
        _id: { $ne: req.params.id }
      });

      if (existingSolarPCU) {
        return res.status(400).json({
          success: false,
          message: `Solar PCU with name ${req.body.name} already exists`
        });
      }
    }

    // Handle image upload if file is provided
    if (req.file) {
      const imagePath = await fileUpload.saveFile(req.file, solarPCU.image);
      req.body.image = imagePath;
    }

    // Parse arrays if provided as strings
    if (req.body.features && typeof req.body.features === 'string') {
      req.body.features = JSON.parse(req.body.features);
    }

    if (req.body.staticTags && typeof req.body.staticTags === 'string') {
      req.body.staticTags = JSON.parse(req.body.staticTags);
    }

    // Convert numeric fields
    if (req.body.wattage) req.body.wattage = Number(req.body.wattage);
    if (req.body.weight) req.body.weight = Number(req.body.weight);
    if (req.body.price) req.body.price = Number(req.body.price);

    // Update Solar PCU
    solarPCU = await SolarPCU.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: solarPCU
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Delete Solar PCU
// @route   DELETE /api/solar-pcus/:id
// @access  Private/Admin
exports.deleteSolarPCU = async (req, res) => {
  try {
    const solarPCU = await SolarPCU.findById(req.params.id);

    if (!solarPCU) {
      return res.status(404).json({
        success: false,
        message: 'Solar PCU not found'
      });
    }

    // Remove from all user carts before deleting
    const { removeProductFromAllCarts } = require('./cart.controller');
    await removeProductFromAllCarts('solar-pcu', req.params.id);

    // Delete image if exists
    if (solarPCU.image) {
      await fileUpload.deleteFile(solarPCU.image);
    }

    await SolarPCU.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {},
      message: 'Solar PCU deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};