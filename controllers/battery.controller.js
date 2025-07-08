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

    // Filter by brand
    if (req.query.brand) query.brand = req.query.brand;

    // Filter by batteryType
    if (req.query.batteryType) query.batteryType = req.query.batteryType;

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
      data: batteries
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

    if (!brand || !category || !name) {
      return res.status(400).json({ success: false, message: 'Brand, Category, and Name are required' });
    }

    // Handle image upload if file is provided
    let imagePath = null;
    if (req.file) imagePath = await fileUpload.saveFile(req.file);

    // Features field handling (array or string)
    let featuresArray = [];
    if (features) {
      if (typeof features === 'string') {
        featuresArray = JSON.parse(features);
      } else if (Array.isArray(features)) {
        featuresArray = features;
      }
    }

    const battery = await Battery.create({
      brand,
      category,
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

    // Name duplicate check (optional)
    if (req.body.name && req.body.name !== battery.name) {
      const existing = await Battery.findOne({ name: req.body.name, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(400).json({ success: false, message: `Battery with name ${req.body.name} already exists` });
      }
    }

    // Handle image upload if file is provided
    if (req.file) {
      req.body.image = await fileUpload.saveFile(req.file, battery.image);
    }

    // Features field
    if (req.body.features) {
      if (typeof req.body.features === 'string') {
        req.body.features = JSON.parse(req.body.features);
      }
    }

    // Convert numeric fields
    if (req.body.AH) req.body.AH = Number(req.body.AH);
    if (req.body.mrp) req.body.mrp = Number(req.body.mrp);
    if (req.body.priceWithoutOldBattery) req.body.priceWithoutOldBattery = Number(req.body.priceWithoutOldBattery);
    if (req.body.priceWithOldBattery) req.body.priceWithOldBattery = Number(req.body.priceWithOldBattery);

    battery = await Battery.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    res.status(200).json({ success: true, data: battery });
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
