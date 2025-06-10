const Category = require('../models/category.model');

// @desc    Get all categories with pagination and search
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res) => {
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
        { description: { $regex: search, $options: 'i' } },
        { batteryType: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by power capacity range if provided
    if (req.query.minPower) {
      searchQuery.powerCapacity = { $gte: parseInt(req.query.minPower) };
    }
    if (req.query.maxPower) {
      if (!searchQuery.powerCapacity) searchQuery.powerCapacity = {};
      searchQuery.powerCapacity.$lte = parseInt(req.query.maxPower);
    }

    // Filter by voltage range if provided
    if (req.query.minVoltage) {
      searchQuery.voltage = { $gte: parseFloat(req.query.minVoltage) };
    }
    if (req.query.maxVoltage) {
      if (!searchQuery.voltage) searchQuery.voltage = {};
      searchQuery.voltage.$lte = parseFloat(req.query.maxVoltage);
    }

    // Filter by battery type if provided
    if (req.query.batteryType) {
      searchQuery.batteryType = req.query.batteryType;
    }

    // Get total count with search applied
    const total = await Category.countDocuments(searchQuery);

    // Query with pagination and search
    const categories = await Category.find(searchQuery)
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
      count: categories.length,
      pagination,
      data: categories
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
exports.getCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private/Admin
exports.createCategory = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      powerCapacity, 
      voltage, 
      batteryType,
      dimensions,
      weight,
      chargingTime,
      dischargingTime,
      image
    } = req.body;

    // Check if category with this name already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: `Category ${name} already exists`
      });
    }

    const category = await Category.create({
      name,
      description,
      powerCapacity,
      voltage,
      batteryType,
      dimensions,
      weight,
      chargingTime,
      dischargingTime,
      image
    });

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
exports.updateCategory = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      powerCapacity, 
      voltage, 
      batteryType,
      dimensions,
      weight,
      chargingTime,
      dischargingTime,
      image
    } = req.body;
    
    let category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if name is being changed and if it already exists
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({ 
        name,
        _id: { $ne: req.params.id }
      });
      
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: `Category ${name} already exists`
        });
      }
    }

    // Build update object
    const updateFields = {};
    if (name) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (powerCapacity !== undefined) updateFields.powerCapacity = powerCapacity;
    if (voltage !== undefined) updateFields.voltage = voltage;
    if (batteryType) updateFields.batteryType = batteryType;
    if (dimensions) updateFields.dimensions = dimensions;
    if (weight) updateFields.weight = weight;
    if (chargingTime !== undefined) updateFields.chargingTime = chargingTime;
    if (dischargingTime !== undefined) updateFields.dischargingTime = dischargingTime;
    if (image) updateFields.image = image;

    category = await Category.findByIdAndUpdate(
      req.params.id,
      updateFields,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Toggle category status (activate/deactivate)
// @route   PUT /api/categories/:id/status
// @access  Private/Admin
exports.toggleCategoryStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    
    let category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    category = await Category.findByIdAndUpdate(
      req.params.id,
      { isActive },
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: category,
      message: `Category ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    await category.remove();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};