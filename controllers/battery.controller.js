const Battery = require('../models/battery');
const fileUpload = require('../utils/fileUpload');

// @desc    Get all Batteries with pagination, search, and filtering
// @route   GET /api/batteries
// @access  Public
exports.getAllBatteries = async (req, res) => {
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
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by category
    if (req.query.category) query.category = req.query.category;

    // Filter by subcategory
    if (req.query.subcategory) query.subcategory = req.query.subcategory;

    // Filter by brand
    if (req.query.brand) query.brand = req.query.brand;

    // Filter by batteryType
    if (req.query.batteryType) query.batteryType = req.query.batteryType;

    // Filter by isFeatured
    if (req.query.isFeatured !== undefined) {
      query.isFeatured = req.query.isFeatured === 'true';
    }

    // Filter by AH (Ampere Hour) range
    if (req.query.minAH || req.query.maxAH) {
      query.AH = {};
      if (req.query.minAH) query.AH.$gte = Number(req.query.minAH);
      if (req.query.maxAH) query.AH.$lte = Number(req.query.maxAH);
    }

    // Filter by price range (MRP)
    if (req.query.minPrice || req.query.maxPrice) {
      query.mrp = {};
      if (req.query.minPrice) query.mrp.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) query.mrp.$lte = Number(req.query.maxPrice);
    }

    // Get total count
    const total = await Battery.countDocuments(query);

    // Sorting
    let sortOption = {};
    if (req.query.sortBy) {
      const sortField = req.query.sortBy;
      const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
      sortOption[sortField] = sortOrder;
    } else {
      sortOption = { createdAt: -1 };
    }

    // Query with pagination
    const batteries = await Battery.find(query)
      .populate('category', 'name')
      .populate('brand', 'name')
      .populate('reviews')
      .sort(sortOption)
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: batteries.length,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total
      },
       batteries
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};


// @desc    Get single Battery
// @route   GET /api/batteries/:id
// @access  Public
exports.getBattery = async (req, res) => {
  try {
    const battery = await Battery.findById(req.params.id)
      .populate('category', 'name')
      .populate('brand', 'name');

    if (!battery) {
      return res.status(404).json({ success: false, message: 'Battery not found' });
    }

    res.status(200).json({ success: true, data: battery });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

// @desc    Create new Battery
// @route   POST /api/batteries
// @access  Private/Admin
exports.createBattery = async (req, res) => {
  try {
    const {
      brand,
      category,
      subcategory,
      name,
      description,
      features,
      nominalFilledWeight,
      batteryType,
      AH,
      dimension,
      warranty,
      mrp,
      priceWithoutOldBattery,
      priceWithOldBattery,
      isFeatured
    } = req.body;

    // Required field validation
    if (!brand || !category || !subcategory || !name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Brand, Category, Subcategory, and Name are required' 
      });
    }

    // Validate subcategory enum
    const validSubcategories = ['truck_battery', '2_wheeler_battery', 'solar_battery', 'genset_battery', 'four_wheeler_battery'];
    if (!validSubcategories.includes(subcategory)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid subcategory. Must be one of: ${validSubcategories.join(', ')}` 
      });
    }

    // Validate batteryType enum if provided
    if (batteryType) {
      const validBatteryTypes = ['li ion', 'lead acid', 'smf'];
      if (!validBatteryTypes.includes(batteryType)) {
        return res.status(400).json({ 
          success: false, 
          message: `Invalid battery type. Must be one of: ${validBatteryTypes.join(', ')}` 
        });
      }
    }

    // Handle image upload if file is provided
    let imagePath = null;
    if (req.file) imagePath = await fileUpload.saveFile(req.file);

    // Features field handling (array or string)
    let featuresArray = [];
    if (features) {
      if (typeof features === 'string') {
        try {
          featuresArray = JSON.parse(features);
        } catch (error) {
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid features format. Must be a valid JSON array.' 
          });
        }
      } else if (Array.isArray(features)) {
        featuresArray = features;
      }
    }

    // Validate numeric fields
    if (AH && isNaN(Number(AH))) {
      return res.status(400).json({ success: false, message: 'AH must be a valid number' });
    }
    if (mrp && isNaN(Number(mrp))) {
      return res.status(400).json({ success: false, message: 'MRP must be a valid number' });
    }
    if (priceWithoutOldBattery && isNaN(Number(priceWithoutOldBattery))) {
      return res.status(400).json({ success: false, message: 'Price without old battery must be a valid number' });
    }
    if (priceWithOldBattery && isNaN(Number(priceWithOldBattery))) {
      return res.status(400).json({ success: false, message: 'Price with old battery must be a valid number' });
    }

    const battery = await Battery.create({
      brand,
      category,
      subcategory,
      name,
      description,
      features: featuresArray,
      nominalFilledWeight,
      batteryType,
      AH: AH ? Number(AH) : undefined,
      dimension,
      warranty,
      mrp: mrp ? Number(mrp) : undefined,
      priceWithoutOldBattery: priceWithoutOldBattery ? Number(priceWithoutOldBattery) : undefined,
      priceWithOldBattery: priceWithOldBattery ? Number(priceWithOldBattery) : undefined,
      image: imagePath,
      isFeatured: typeof isFeatured === 'string' ? isFeatured === 'true' : !!isFeatured
    });

    res.status(201).json({ success: true, data: battery });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

// @desc    Update Battery
// @route   PUT /api/batteries/:id
// @access  Private/Admin
exports.updateBattery = async (req, res) => {
  try {
    let battery = await Battery.findById(req.params.id);
    if (!battery) {
      return res.status(404).json({ success: false, message: 'Battery not found' });
    }

    // Validate subcategory enum if provided
    if (req.body.subcategory) {
      const validSubcategories = ['truck_battery', '2_wheeler_battery', 'solar_battery', 'genset_battery', 'four_wheeler_battery'];
      if (!validSubcategories.includes(req.body.subcategory)) {
        return res.status(400).json({ 
          success: false, 
          message: `Invalid subcategory. Must be one of: ${validSubcategories.join(', ')}` 
        });
      }
    }

    // Handle image upload if file is provided
    if (req.file) {
      req.body.image = await fileUpload.saveFile(req.file, battery.image);
    }

    // Features field
    if (req.body.features) {
      if (typeof req.body.features === 'string') {
        try {
          req.body.features = JSON.parse(req.body.features);
        } catch (error) {
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid features format. Must be a valid JSON array.' 
          });
        }
      }
    }

    // Convert numeric fields
    if (req.body.AH) req.body.AH = Number(req.body.AH);
    if (req.body.mrp) req.body.mrp = Number(req.body.mrp);
    if (req.body.priceWithoutOldBattery && req.body.priceWithoutOldBattery !== '') {
      req.body.priceWithoutOldBattery = Number(req.body.priceWithoutOldBattery);
    } else {
      req.body.priceWithoutOldBattery = null;
    }
    if (req.body.priceWithOldBattery && req.body.priceWithOldBattery !== '') {
      req.body.priceWithOldBattery = Number(req.body.priceWithOldBattery);
    } else {
      req.body.priceWithOldBattery = null;
    }

    // Handle boolean conversion for isFeatured
    if (req.body.isFeatured !== undefined) {
      req.body.isFeatured = typeof req.body.isFeatured === 'string' ? req.body.isFeatured === 'true' : !!req.body.isFeatured;
    }

    // Use findByIdAndUpdate with upsert and strict options
    battery = await Battery.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { 
        new: true, 
        runValidators: true,
        strict: false, // This allows adding new fields
        upsert: false
      }
    );

    res.status(200).json({ success: true,  battery });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};


// @desc    Toggle Battery status (activate/deactivate)
// @route   PUT /api/batteries/:id/status
// @access  Private/Admin
exports.toggleBatteryStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    let battery = await Battery.findById(req.params.id);

    if (!battery) {
      return res.status(404).json({ success: false, message: 'Battery not found' });
    }

    battery = await Battery.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: battery,
      message: `Battery ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

// @desc    Delete Battery
// @route   DELETE /api/batteries/:id
// @access  Private/Admin
exports.deleteBattery = async (req, res) => {
  try {
    const battery = await Battery.findById(req.params.id);
    if (!battery) {
      return res.status(404).json({ success: false, message: 'Battery not found' });
    }
    // Remove from all user carts before deleting
    const { removeProductFromAllCarts } = require('./cart.controller');
    await removeProductFromAllCarts('battery', req.params.id);
    // Delete image if exists
    if (battery.image) {
      await fileUpload.deleteFile(battery.image);
    }
    await Battery.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, data: {}, message: 'Battery deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};
