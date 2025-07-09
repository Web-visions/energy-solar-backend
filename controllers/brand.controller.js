const Brand = require('../models/brand.model');
const fileUpload = require('../utils/fileUpload');

// @desc    Get all brands with pagination and search
// @route   GET /api/brands
// @access  Public
exports.getBrands = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const search = req.query.search || '';

    // Create search query
    const searchQuery = {};
    if (search) {
      searchQuery.name = { $regex: search, $options: 'i' };
    }

    // Get total count with search applied
    const total = await Brand.countDocuments(searchQuery);

    // Query with pagination and search
    const brands = await Brand.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(100);

    // Pagination result
    const pagination = {};
    pagination.total = total;
    pagination.pages = Math.ceil(total / limit);
    pagination.page = page;
    pagination.limit = 100;

    if (page < pagination.pages) {
      pagination.next = page + 1;
    }

    if (page > 1) {
      pagination.prev = page - 1;
    }

    res.status(200).json({
      success: true,
      count: brands.length,
      pagination,
      data: brands
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get single brand
// @route   GET /api/brands/:id
// @access  Public
exports.getBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    res.status(200).json({
      success: true,
      data: brand
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Create new brand
// @route   POST /api/brands
// @access  Private/Admin
exports.createBrand = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a brand name'
      });
    }

    // Check if logo file is uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a brand logo'
      });
    }

    // Check if brand with this name already exists
    const existingBrand = await Brand.findOne({ name });
    if (existingBrand) {
      return res.status(400).json({
        success: false,
        message: `Brand with name ${name} already exists`
      });
    }

    // Save logo file
    const logoPath = await fileUpload.saveFile(req.file);

    const brand = await Brand.create({
      name,
      logo: logoPath,
      description
    });

    res.status(201).json({
      success: true,
      data: brand
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Update brand
// @route   PUT /api/brands/:id
// @access  Private/Admin
exports.updateBrand = async (req, res) => {
  try {
    const { name, description } = req.body;

    let brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Check if name is being changed and if it already exists
    if (name && name !== brand.name) {
      const existingBrand = await Brand.findOne({ name });
      if (existingBrand) {
        return res.status(400).json({
          success: false,
          message: `Brand with name ${name} already exists`
        });
      }
    }

    // Build update object
    const updateFields = {};
    if (name) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;

    // Handle logo update if file is uploaded
    if (req.file) {
      const logoPath = await fileUpload.saveFile(req.file, brand.logo);
      updateFields.logo = logoPath;
    }

    brand = await Brand.findByIdAndUpdate(
      req.params.id,
      updateFields,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: brand
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Toggle brand status (activate/deactivate)
// @route   PUT /api/brands/:id/status
// @access  Private/Admin
exports.toggleBrandStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    let brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    brand = await Brand.findByIdAndUpdate(
      req.params.id,
      { isActive },
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: brand,
      message: `Brand ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Delete brand
// @route   DELETE /api/brands/:id
// @access  Private/Admin
exports.deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Delete logo file
    if (brand.logo) {
      await fileUpload.deleteFile(brand.logo);
    }

    await Brand.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {},
      message: 'Brand deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};