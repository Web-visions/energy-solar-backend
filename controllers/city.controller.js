const City = require('../models/city.model');

// @desc    Get all cities with pagination and search
// @route   GET /api/cities
// @access  Public
exports.getCities = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const search = req.query.search || '';

    // Create search query
    const searchQuery = {};
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { state: { $regex: search, $options: 'i' } },
        { pincode: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count with search applied
    const total = await City.countDocuments(searchQuery);

    // Query with pagination and search
    const cities = await City.find(searchQuery)
      .sort({ name: 1 })
      .skip(startIndex)
      .limit(limit);

    // Pagination result
    const pagination = {};
    pagination.total = total;
    pagination.pages = Math.ceil(total / limit);
    pagination.page = page;
    pagination.limit = limit;

    if (page < pagination.pages) {
      pagination.next = page + 1;
    }

    if (page > 1) {
      pagination.prev = page - 1;
    }

    res.status(200).json({
      success: true,
      count: cities.length,
      pagination,
      data: cities
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get single city
// @route   GET /api/cities/:id
// @access  Public
exports.getCity = async (req, res) => {
  try {
    const city = await City.findById(req.params.id);

    if (!city) {
      return res.status(404).json({
        success: false,
        message: 'City not found'
      });
    }

    res.status(200).json({
      success: true,
      data: city
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Create new city
// @route   POST /api/cities
// @access  Private/Admin
exports.createCity = async (req, res) => {
  try {
    const { name, state, pincode, deliveryCharge, estimatedDeliveryDays } = req.body;

    // Check if city with this name already exists
    const existingCity = await City.findOne({ name, state });
    if (existingCity) {
      return res.status(400).json({
        success: false,
        message: `City ${name} in ${state} already exists`
      });
    }

    const city = await City.create({
      name,
      state,
      pincode,
      deliveryCharge,
      estimatedDeliveryDays
    });

    res.status(201).json({
      success: true,
      data: city
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Update city
// @route   PUT /api/cities/:id
// @access  Private/Admin
exports.updateCity = async (req, res) => {
  try {
    const { name, state, pincode, deliveryCharge, estimatedDeliveryDays } = req.body;

    let city = await City.findById(req.params.id);

    if (!city) {
      return res.status(404).json({
        success: false,
        message: 'City not found'
      });
    }

    // Check if name and state are being changed and if they already exist
    if ((name && name !== city.name) || (state && state !== city.state)) {
      const existingCity = await City.findOne({
        name: name || city.name,
        state: state || city.state,
        _id: { $ne: req.params.id }
      });

      if (existingCity) {
        return res.status(400).json({
          success: false,
          message: `City ${name || city.name} in ${state || city.state} already exists`
        });
      }
    }

    // Build update object
    const updateFields = {};
    if (name) updateFields.name = name;
    if (state) updateFields.state = state;
    if (pincode !== undefined) updateFields.pincode = pincode;
    if (deliveryCharge !== undefined) updateFields.deliveryCharge = deliveryCharge;
    if (estimatedDeliveryDays !== undefined) updateFields.estimatedDeliveryDays = estimatedDeliveryDays;

    city = await City.findByIdAndUpdate(
      req.params.id,
      updateFields,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: city
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Toggle city status (activate/deactivate)
// @route   PUT /api/cities/:id/status
// @access  Private/Admin
exports.toggleCityStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    let city = await City.findById(req.params.id);

    if (!city) {
      return res.status(404).json({
        success: false,
        message: 'City not found'
      });
    }

    city = await City.findByIdAndUpdate(
      req.params.id,
      { isActive },
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: city,
      message: `City ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Delete city
// @route   DELETE /api/cities/:id
// @access  Private/Admin
exports.deleteCity = async (req, res) => {
  try {
    const city = await City.findById(req.params.id);

    if (!city) {
      return res.status(404).json({
        success: false,
        message: 'City not found'
      });
    }

    await city.remove();

    res.status(200).json({
      success: true,
      data: {},
      message: 'City deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// Get active cities for checkout
exports.getActiveCities = async (req, res) => {
  try {
    const cities = await City.find({ isActive: true })
      .select('name state deliveryCharge estimatedDeliveryDays')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: cities
    });
  } catch (error) {
    console.error('Error fetching active cities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active cities'
    });
  }
};