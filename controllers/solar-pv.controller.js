const SolarPVModule = require('../models/solor-pv.model');
const mongoose = require('mongoose');
const fileUpload = require('../utils/fileUpload');

// @desc    Get all Solar PV Modules with pagination, search, and filtering
// @route   GET /api/solar-pv-modules
// @access  Public
exports.getAllSolarPVModules = async (req, res) => {
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
        { modelName: { $regex: search, $options: 'i' } },
        { manufacturer: { $regex: search, $options: 'i' } },
        { packer: { $regex: search, $options: 'i' } },
        { importer: { $regex: search, $options: 'i' } }
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

    // Filter by weight range
    if (req.query.minWeight || req.query.maxWeight) {
      query.weight = {};
      if (req.query.minWeight) query.weight.$gte = Number(req.query.minWeight);
      if (req.query.maxWeight) query.weight.$lte = Number(req.query.maxWeight);
    }

    // Get total count with filters applied
    const total = await SolarPVModule.countDocuments(query);

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
    const solarPVModules = await SolarPVModule.find(query)
      .populate('category', 'name')
      // .populate('reviews')
      .sort(sortOption)
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: solarPVModules.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: solarPVModules
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Get single Solar PV Module
// @route   GET /api/solar-pv-modules/:id
// @access  Public
exports.getSolarPVModule = async (req, res) => {
  try {
    const solarPVModule = await SolarPVModule.findById(req.params.id)
      .populate('category', 'name')
    // .populate('reviews');

    if (!solarPVModule) {
      return res.status(404).json({
        success: false,
        message: 'Solar PV Module not found'
      });
    }

    res.status(200).json({
      success: true,
      data: solarPVModule
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Create new Solar PV Module
// @route   POST /api/solar-pv-modules
// @access  Private/Admin
exports.createSolarPVModule = async (req, res) => {
  try {
    const {
      category,
      name,
      description,
      brand,
      modelName,
      sku,
      type,
      weight,
      dimension,
      manufacturer,
      packer,
      importer,
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

    // Check if Solar PV Module with this name already exists
    const existingSolarPVModule = await SolarPVModule.findOne({ name });
    if (existingSolarPVModule) {
      return res.status(400).json({
        success: false,
        message: `Solar PV Module with name ${name} already exists`
      });
    }

    // Handle multiple image uploads if files are provided
    let imagePaths = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const imagePath = await fileUpload.saveFile(file);
        imagePaths.push(imagePath);
      }
    }

    // Create Solar PV Module
    const solarPVModule = await SolarPVModule.create({
      category,
      name,
      description,
      brand,
      modelName,
      sku,
      type,
      weight: weight ? Number(weight) : undefined,
      dimension,
      manufacturer,
      packer,
      importer,
      replacementPolicy,
      staticTags: staticTags ? JSON.parse(staticTags) : [],
      price: Number(price),
      images: imagePaths.length > 0 ? imagePaths : undefined,
      isFeatured: typeof isFeatured === 'string' ? isFeatured === 'true' : !!isFeatured
    });

    res.status(201).json({
      success: true,
      data: solarPVModule
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Update Solar PV Module
// @route   PUT /api/solar-pv-modules/:id
// @access  Private/Admin
exports.updateSolarPVModule = async (req, res) => {
  try {
    let solarPVModule = await SolarPVModule.findById(req.params.id);

    if (!solarPVModule) {
      return res.status(404).json({
        success: false,
        message: 'Solar PV Module not found'
      });
    }

    // Check if name is being changed and if it already exists
    if (req.body.name && req.body.name !== solarPVModule.name) {
      const existingSolarPVModule = await SolarPVModule.findOne({
        name: req.body.name,
        _id: { $ne: req.params.id }
      });

      if (existingSolarPVModule) {
        return res.status(400).json({
          success: false,
          message: `Solar PV Module with name ${req.body.name} already exists`
        });
      }
    }

    // Handle multiple image uploads if files are provided
    if (req.files && req.files.length > 0) {
      // Delete old images if they exist
      if (solarPVModule.images && solarPVModule.images.length > 0) {
        for (const image of solarPVModule.images) {
          await fileUpload.deleteFile(image);
        }
      }

      // Upload new images
      const imagePaths = [];
      for (const file of req.files) {
        const imagePath = await fileUpload.saveFile(file);
        imagePaths.push(imagePath);
      }
      req.body.images = imagePaths;
    }

    // Parse staticTags if provided as string
    if (req.body.staticTags && typeof req.body.staticTags === 'string') {
      req.body.staticTags = JSON.parse(req.body.staticTags);
    }

    // Convert numeric fields
    if (req.body.weight) req.body.weight = Number(req.body.weight);
    if (req.body.price) req.body.price = Number(req.body.price);

    // Update Solar PV Module
    solarPVModule = await SolarPVModule.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: solarPVModule
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Delete Solar PV Module
// @route   DELETE /api/solar-pv-modules/:id
// @access  Private/Admin
exports.deleteSolarPVModule = async (req, res) => {
  try {
    const solarPVModule = await SolarPVModule.findById(req.params.id);

    if (!solarPVModule) {
      return res.status(404).json({
        success: false,
        message: 'Solar PV Module not found'
      });
    }

    // Remove from all user carts before deleting
    const { removeProductFromAllCarts } = require('./cart.controller');
    await removeProductFromAllCarts('solar-pv', req.params.id);

    // Delete images if they exist
    if (solarPVModule.images && solarPVModule.images.length > 0) {
      for (const image of solarPVModule.images) {
        await fileUpload.deleteFile(image);
      }
    }

    await SolarPVModule.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {},
      message: 'Solar PV Module deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};