const Inverter = require('../models/inverter.model');
const mongoose = require('mongoose');
const fileUpload = require('../utils/fileUpload');

// @desc    Get all Inverters with pagination, search, and filtering
// @route   GET /api/inverters
// @access  Public
exports.getAllInverters = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    let limit = 10;
    if (req.query.isFeatured === 'true') {
      limit = Number(req.query.limit) || 6;
    } else if (req.query.limit) {
      limit = Number(req.query.limit);
    }
    const startIndex = (page - 1) * limit;
    const search = req.query.search || '';

    // Create base query
    const query = {};

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter by capacity range
    if (req.query.minCapacity || req.query.maxCapacity) {
      query.capacity = {};
      if (req.query.minCapacity) query.capacity.$gte = Number(req.query.minCapacity);
      if (req.query.maxCapacity) query.capacity.$lte = Number(req.query.maxCapacity);
    }

    // Filter by price range (MRP)
    if (req.query.minPrice || req.query.maxPrice) {
      query.mrp = {};
      if (req.query.minPrice) query.mrp.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) query.mrp.$lte = Number(req.query.maxPrice);
    }

    // Get total count with filters applied
    const total = await Inverter.countDocuments(query);

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
    const inverters = await Inverter.find(query)
      .populate('category', 'name')
      // .populate('reviews')
      .sort(sortOption)
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: inverters.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: inverters
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Get single Inverter
// @route   GET /api/inverters/:id
// @access  Public
exports.getInverter = async (req, res) => {
  try {
    const inverter = await Inverter.findById(req.params.id)
      .populate('category', 'name')
    // .populate('reviews');

    if (!inverter) {
      return res.status(404).json({
        success: false,
        message: 'Inverter not found'
      });
    }

    res.status(200).json({
      success: true,
      data: inverter
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Create new Inverter
// @route   POST /api/inverters
// @access  Private/Admin
exports.createInverter = async (req, res) => {
  try {
    const {
      category,
      name,
      brand,
      description,
      features,
      dimension,
      capacity,
      warranty,
      mrp,
      sellingPrice,
      isFeatured
    } = req.body;

    // Validate required fields
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }

    if (!brand) {
      return res.status(400).json({
        success: false,
        message: 'Brand is required'
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    const foundBrand = await mongoose.model('Brand').findById(brand);
    if (!foundBrand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Check if Inverter with this name already exists
    const existingInverter = await Inverter.findOne({ name });
    if (existingInverter) {
      return res.status(400).json({
        success: false,
        message: `Inverter with name ${name} already exists`
      });
    }

    // Handle image upload if file is provided
    let imagePath = null;
    if (req.file) {
      imagePath = await fileUpload.saveFile(req.file);
    }

    // Create Inverter
    const inverter = await Inverter.create({
      category,
      name,
      brand,
      description,
      features: features ? JSON.parse(features) : [],
      dimension,
      capacity: capacity ? Number(capacity) : undefined,
      warranty,
      mrp: mrp ? Number(mrp) : undefined,
      sellingPrice: sellingPrice ? Number(sellingPrice) : undefined,
      image: imagePath,
      isFeatured: typeof isFeatured === 'string' ? isFeatured === 'true' : !!isFeatured
    });

    res.status(201).json({
      success: true,
      data: inverter
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Update Inverter
// @route   PUT /api/inverters/:id
// @access  Private/Admin
exports.updateInverter = async (req, res) => {
  try {
    let inverter = await Inverter.findById(req.params.id);

    if (!inverter) {
      return res.status(404).json({
        success: false,
        message: 'Inverter not found'
      });
    }

    // Check if name is being changed and if it already exists
    if (req.body.name && req.body.name !== inverter.name) {
      const existingInverter = await Inverter.findOne({
        name: req.body.name,
        _id: { $ne: req.params.id }
      });

      if (req.body.brand) {
        const foundBrand = await mongoose.model('Brand').findById(req.body.brand);
        if (!foundBrand) {
          return res.status(404).json({
            success: false,
            message: 'Brand not found'
          });
        }
      }

      if (existingInverter) {
        return res.status(400).json({
          success: false,
          message: `Inverter with name ${req.body.name} already exists`
        });
      }
    }

    // Handle image upload if file is provided
    if (req.file) {
      const imagePath = await fileUpload.saveFile(req.file, inverter.image);
      req.body.image = imagePath;
    }

    // Parse features if provided as string
    if (req.body.features && typeof req.body.features === 'string') {
      req.body.features = JSON.parse(req.body.features);
    }

    // Convert numeric fields
    if (req.body.capacity) req.body.capacity = Number(req.body.capacity);
    if (req.body.mrp) req.body.mrp = Number(req.body.mrp);
    if (req.body.sellingPrice) req.body.sellingPrice = Number(req.body.sellingPrice)
    // Update Inverter
    inverter = await Inverter.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: inverter
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Delete Inverter
// @route   DELETE /api/inverters/:id
// @access  Private/Admin
exports.deleteInverter = async (req, res) => {
  try {
    const inverter = await Inverter.findById(req.params.id);

    if (!inverter) {
      return res.status(404).json({
        success: false,
        message: 'Inverter not found'
      });
    }

    // Remove from all user carts before deleting
    const { removeProductFromAllCarts } = require('./cart.controller');
    await removeProductFromAllCarts('inverter', req.params.id);

    // Delete image if exists
    if (inverter.image) {
      await fileUpload.deleteFile(inverter.image);
    }

    await Inverter.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {},
      message: 'Inverter deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};