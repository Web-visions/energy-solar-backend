const Battery = require('../models/battery');
const fileUpload = require('../utils/fileUpload');


 // Helper to parse a field into an array (accepts JSON string, comma-separated string, array, or single id)
    function parseToArray(value) {
      if (value === undefined || value === null) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') return [];
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed;
          return [parsed];
        } catch (err) {
          // fallback: comma-separated or single value
          if (trimmed.includes(',')) {
            return trimmed.split(',').map(item => item.trim()).filter(Boolean);
          }
          return [trimmed];
        }
      }
      return [value];
    }


// @desc    Get all Batteries with pagination, search, and filtering
// @route   GET /api/batteries
// @access  Public
exports.getAllBatteries = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const search = req.query.search || '';

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (req.query.category) query.category = req.query.category;
    if (req.query.subcategory) query.subcategory = req.query.subcategory;
    if (req.query.brand) query.brand = req.query.brand;
    if (req.query.batteryType) query.batteryType = req.query.batteryType;
    if (req.query.isFeatured !== undefined) {
      query.isFeatured = req.query.isFeatured === 'true';
    }

    if (req.query.minAH || req.query.maxAH) {
      query.AH = {};
      if (req.query.minAH) query.AH.$gte = Number(req.query.minAH);
      if (req.query.maxAH) query.AH.$lte = Number(req.query.maxAH);
    }

    if (req.query.minPrice || req.query.maxPrice) {
      query.mrp = {};
      if (req.query.minPrice) query.mrp.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) query.mrp.$lte = Number(req.query.maxPrice);
    }

    if (req.query.manufacturer) {
      query.manufacturer = req.query.manufacturer;
    }
    if (req.query.productLine) {
      query.productLine = req.query.productLine;
    }
    if (req.query.vehicleModel) {
      query.vehicleModel = req.query.vehicleModel;
    }

    const total = await Battery.countDocuments(query);

    let sortOption = {};
    if (req.query.sortBy) {
      const sortField = req.query.sortBy;
      const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
      sortOption[sortField] = sortOrder;
    } else {
      sortOption = { createdAt: -1 };
    }

    const batteries = await Battery.find(query)
      .populate('category', 'name')
      .populate('brand', 'name')
      .populate('productLine', 'name')
      .populate('manufacturer', 'name')
      .populate('vehicleModel', 'name manufacturer')
      .populate('compatibleManufacturers', 'name')
      .populate('compatibleModels', 'name manufacturer')
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
      .populate('brand', 'name')
      .populate('productLine', 'name')
      .populate('manufacturer', 'name')
      .populate('vehicleModel', 'name manufacturer')
      .populate('compatibleManufacturers', 'name')
      .populate('compatibleModels', 'name manufacturer')
      .populate('reviews');

    if (!battery) {
      return res.status(404).json({ success: false, message: 'Battery not found' });
    }

    res.status(200).json({ success: true, battery });
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
      productLine, // Added productLine
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
      isFeatured,
      // NEW VEHICLE/MANUFACTURER FIELDS (now support multiple)
      manufacturer,
      vehicleModel,
      compatibleManufacturers,
      compatibleModels
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

   

    // Parse manufacturer (now supports multiple)
    const manufacturerArray = parseToArray(manufacturer);

    // Parse vehicleModel (now supports multiple)
    const vehicleModelArray = parseToArray(vehicleModel);

    // Handle compatibleManufacturers array
    let compatibleManufacturersArray = [];
    if (compatibleManufacturers) {
      if (typeof compatibleManufacturers === 'string') {
        try {
          compatibleManufacturersArray = JSON.parse(compatibleManufacturers);
        } catch (error) {
          // If it's a single string ID, convert to array
          compatibleManufacturersArray = [compatibleManufacturers];
        }
      } else if (Array.isArray(compatibleManufacturers)) {
        compatibleManufacturersArray = compatibleManufacturers;
      }
    }

    // Handle compatibleModels array
    let compatibleModelsArray = [];
    if (compatibleModels) {
      if (typeof compatibleModels === 'string') {
        try {
          compatibleModelsArray = JSON.parse(compatibleModels);
        } catch (error) {
          // If it's a single string ID, convert to array
          compatibleModelsArray = [compatibleModels];
        }
      } else if (Array.isArray(compatibleModels)) {
        compatibleModelsArray = compatibleModels;
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
      productLine: productLine || undefined, // Added productLine
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
      isFeatured: typeof isFeatured === 'string' ? isFeatured === 'true' : !!isFeatured,
      // NEW VEHICLE/MANUFACTURER FIELDS (arrays)
      manufacturer: manufacturerArray.length ? manufacturerArray : undefined,
      vehicleModel: vehicleModelArray.length ? vehicleModelArray : undefined,
      compatibleManufacturers: compatibleManufacturersArray,
      compatibleModels: compatibleModelsArray
    });

    res.status(201).json({ success: true, battery });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};


// @desc    Update Battery
// @route   PUT /api/batteries/:id
// @access  Private/Admin
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

    // Validate batteryType enum if provided
    if (req.body.batteryType) {
      const validBatteryTypes = ['li ion', 'lead acid', 'smf'];
      if (!validBatteryTypes.includes(req.body.batteryType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid battery type. Must be one of: ${validBatteryTypes.join(', ')}`
        });
      }
    }

    // Handle image upload if file is provided
    if (req.file) {
      req.body.image = await fileUpload.saveFile(req.file, battery.image);
    }

    // Features field handling
    if (req.body.features !== undefined) {
      if (req.body.features === '' || req.body.features === null) {
        req.body.features = [];
      } else if (typeof req.body.features === 'string') {
        try {
          req.body.features = JSON.parse(req.body.features);
          if (!Array.isArray(req.body.features)) {
            req.body.features = [req.body.features];
          }
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: 'Invalid features format. Must be a valid JSON array.'
          });
        }
      }
      // if it's already an array, leave it
    }

    // Handle manufacturer -> allow multiple (JSON string, comma-separated, array, single id)
    if (req.body.manufacturer !== undefined) {
      if (req.body.manufacturer === '' || req.body.manufacturer === null) {
        req.body.manufacturer = [];
      } else {
        req.body.manufacturer = parseToArray(req.body.manufacturer);
      }
    }

    // Handle vehicleModel -> allow multiple (JSON string, comma-separated, array, single id)
    if (req.body.vehicleModel !== undefined) {
      if (req.body.vehicleModel === '' || req.body.vehicleModel === null) {
        req.body.vehicleModel = [];
      } else {
        req.body.vehicleModel = parseToArray(req.body.vehicleModel);
      }
    }

    // Handle compatibleManufacturers array
    if (req.body.compatibleManufacturers !== undefined) {
      if (req.body.compatibleManufacturers === '' || req.body.compatibleManufacturers === null) {
        req.body.compatibleManufacturers = [];
      } else if (typeof req.body.compatibleManufacturers === 'string') {
        try {
          const parsed = JSON.parse(req.body.compatibleManufacturers);
          req.body.compatibleManufacturers = Array.isArray(parsed) ? parsed : [parsed];
        } catch (error) {
          // If it's a single string ID, convert to array
          req.body.compatibleManufacturers = [req.body.compatibleManufacturers];
        }
      } else if (!Array.isArray(req.body.compatibleManufacturers)) {
        req.body.compatibleManufacturers = [];
      }
    }

    // Handle compatibleModels array
    if (req.body.compatibleModels !== undefined) {
      if (req.body.compatibleModels === '' || req.body.compatibleModels === null) {
        req.body.compatibleModels = [];
      } else if (typeof req.body.compatibleModels === 'string') {
        try {
          const parsed = JSON.parse(req.body.compatibleModels);
          req.body.compatibleModels = Array.isArray(parsed) ? parsed : [parsed];
        } catch (error) {
          // If it's a single string ID, convert to array
          req.body.compatibleModels = [req.body.compatibleModels];
        }
      } else if (!Array.isArray(req.body.compatibleModels)) {
        req.body.compatibleModels = [];
      }
    }

    // Convert numeric fields
    if (req.body.AH !== undefined && req.body.AH !== '') req.body.AH = Number(req.body.AH);
    if (req.body.mrp !== undefined && req.body.mrp !== '') req.body.mrp = Number(req.body.mrp);

    if (req.body.priceWithoutOldBattery !== undefined) {
      if (req.body.priceWithoutOldBattery !== '' && req.body.priceWithoutOldBattery !== null) {
        req.body.priceWithoutOldBattery = Number(req.body.priceWithoutOldBattery);
      } else {
        req.body.priceWithoutOldBattery = null;
      }
    }

    if (req.body.priceWithOldBattery !== undefined) {
      if (req.body.priceWithOldBattery !== '' && req.body.priceWithOldBattery !== null) {
        req.body.priceWithOldBattery = Number(req.body.priceWithOldBattery);
      } else {
        req.body.priceWithOldBattery = null;
      }
    }

    // Handle boolean conversion for isFeatured
    if (req.body.isFeatured !== undefined) {
      req.body.isFeatured = typeof req.body.isFeatured === 'string' ? req.body.isFeatured === 'true' : !!req.body.isFeatured;
    }

    // Handle empty string to undefined conversion for optional ObjectId fields
    if (req.body.productLine === '') req.body.productLine = undefined;

    // Use findByIdAndUpdate with options
    battery = await Battery.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
        strict: false,
        upsert: false
      }
    )
      .populate('category', 'name')
      .populate('brand', 'name')
      .populate('productLine', 'name')
      .populate('manufacturer', 'name')
      .populate('vehicleModel', 'name manufacturer')
      .populate('compatibleManufacturers', 'name')
      .populate('compatibleModels', 'name manufacturer');

    res.status(200).json({ success: true, battery });
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
