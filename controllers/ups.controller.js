const UPS = require('../models/ups.model');
const fileUpload = require('../utils/fileUpload');
const { removeProductFromAllCarts } = require('./cart.controller');

// @desc    Get all UPS with pagination, search, filtering (with brand support)
// @route   GET /api/ups
// @access  Public
exports.getAllUPS = async (req, res) => {
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
        { type: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by category
    if (req.query.category) query.category = req.query.category;
    // Filter by brand
    if (req.query.brand) query.brand = req.query.brand;
    // Filter by type
    if (req.query.type) query.type = req.query.type;
    // Filter by price range
    if (req.query.minPrice || req.query.maxPrice) {
      query.sellingPrice = {};
      if (req.query.minPrice) query.sellingPrice.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) query.sellingPrice.$lte = Number(req.query.maxPrice);
    }
    // Filter by power wattage range
    if (req.query.minWattage || req.query.maxWattage) {
      query.outputPowerWattage = {};
      if (req.query.minWattage) query.outputPowerWattage.$gte = Number(req.query.minWattage);
      if (req.query.maxWattage) query.outputPowerWattage.$lte = Number(req.query.maxWattage);
    }

    const total = await UPS.countDocuments(query);

    // Sorting
    let sortOption = {};
    if (req.query.sortBy) {
      const sortField = req.query.sortBy;
      const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
      sortOption[sortField] = sortOrder;
    } else {
      sortOption = { createdAt: -1 };
    }

    const upsList = await UPS.find(query)
      .populate('category', 'name')
      .populate('brand', 'name')
      .sort(sortOption)
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: upsList.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: upsList
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Get single UPS
// @route   GET /api/ups/:id
// @access  Public
exports.getUPS = async (req, res) => {
  try {
    const ups = await UPS.findById(req.params.id)
      .populate('category', 'name')
      .populate('brand', 'name');
    if (!ups) {
      return res.status(404).json({
        success: false,
        message: 'UPS not found'
      });
    }
    res.status(200).json({
      success: true,
      data: ups
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Create new UPS
// @route   POST /api/ups
// @access  Private/Admin
exports.createUPS = async (req, res) => {
  try {
    const {
      category,
      brand,
      name,
      description,
      features,
      type,
      outputPowerWattage,
      inputVoltage,
      outputVoltage,
      inputFreq,
      outputFreq,
      dimension,
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

    // Check if UPS with this name already exists
    const existingUPS = await UPS.findOne({ name });
    if (existingUPS) {
      return res.status(400).json({
        success: false,
        message: `UPS with name ${name} already exists`
      });
    }

    // Handle image upload if file is provided
    let imagePath = null;
    if (req.file) {
      imagePath = await fileUpload.saveFile(req.file);
    }

    const ups = await UPS.create({
      category,
      brand,
      name,
      description,
      features: features ? JSON.parse(features) : [],
      type,
      outputPowerWattage: outputPowerWattage ? Number(outputPowerWattage) : undefined,
      inputVoltage: inputVoltage ? Number(inputVoltage) : undefined,
      outputVoltage: outputVoltage ? Number(outputVoltage) : undefined,
      inputFreq: inputFreq ? Number(inputFreq) : undefined,
      outputFreq: outputFreq ? Number(outputFreq) : undefined,
      dimension,
      warranty,
      mrp: mrp ? Number(mrp) : undefined,
      sellingPrice: sellingPrice ? Number(sellingPrice) : undefined,
      image: imagePath,
      isFeatured: typeof isFeatured === 'string' ? isFeatured === 'true' : !!isFeatured
    });

    res.status(201).json({
      success: true,
      data: ups
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Update UPS
// @route   PUT /api/ups/:id
// @access  Private/Admin
exports.updateUPS = async (req, res) => {
  try {
    let ups = await UPS.findById(req.params.id);

    if (!ups) {
      return res.status(404).json({
        success: false,
        message: 'UPS not found'
      });
    }

    // Check if name is being changed and if it already exists
    if (req.body.name && req.body.name !== ups.name) {
      const existingUPS = await UPS.findOne({
        name: req.body.name,
        _id: { $ne: req.params.id }
      });

      if (existingUPS) {
        return res.status(400).json({
          success: false,
          message: `UPS with name ${req.body.name} already exists`
        });
      }
    }

    // Handle image upload if file is provided
    if (req.file) {
      const imagePath = await fileUpload.saveFile(req.file, ups.image);
      req.body.image = imagePath;
    }

    // Parse features if provided as string
    if (req.body.features && typeof req.body.features === 'string') {
      req.body.features = JSON.parse(req.body.features);
    }

    // Convert numeric fields
    if (req.body.outputPowerWattage) req.body.outputPowerWattage = Number(req.body.outputPowerWattage);
    if (req.body.inputVoltage) req.body.inputVoltage = Number(req.body.inputVoltage);
    if (req.body.outputVoltage) req.body.outputVoltage = Number(req.body.outputVoltage);
    if (req.body.inputFreq) req.body.inputFreq = Number(req.body.inputFreq);
    if (req.body.outputFreq) req.body.outputFreq = Number(req.body.outputFreq);
    if (req.body.mrp) req.body.mrp = Number(req.body.mrp);
    if (req.body.sellingPrice) req.body.sellingPrice = Number(req.body.sellingPrice);

    // Brand/category can be updated
    if (req.body.brand) ups.brand = req.body.brand;
    if (req.body.category) ups.category = req.body.category;

    ups = await UPS.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: ups
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Delete UPS
// @route   DELETE /api/ups/:id
// @access  Private/Admin
exports.deleteUPS = async (req, res) => {
  try {
    const ups = await UPS.findById(req.params.id);

    if (!ups) {
      return res.status(404).json({
        success: false,
        message: 'UPS not found'
      });
    }

    // Remove from all user carts before deleting
    await removeProductFromAllCarts('ups', req.params.id);

    // Delete image if exists
    if (ups.image) {
      await fileUpload.deleteFile(ups.image);
    }

    await UPS.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {},
      message: 'UPS deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};
