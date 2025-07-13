const Product = require('../models/product.model');
const mongoose = require('mongoose');
const UPS = require('../models/ups.model');
const SolarPCU = require('../models/solor-pcu.model');
const SolarPV = require('../models/solor-pv.model');
const SolarStreetLight = require('../models/solor-street-light.model');
const Inverter = require('../models/inverter.model');
const Battery = require('../models/battery');
const Brand = require('../models/brand.model');
const Category = require('../models/category.model');
const Review = require('../models/Review');

// @desc    Get all products with pagination, search, and filtering
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const search = req.query.search || '';

    // Search
    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const productType = req.query.type;
    let products = [];
    let total = 0;

    if (productType && productType !== "") {
      if (productType.startsWith('solar')) {
        const andFilters = [];

        if (req.query.brand) {
          if (!mongoose.Types.ObjectId.isValid(req.query.brand)) {
            return res.status(400).json({ success: false, message: 'Invalid brand ID format' });
          }
          const brandId = new mongoose.Types.ObjectId(req.query.brand);
          andFilters.push({ brand: brandId });
        }
        if (req.query.category) {
          if (!mongoose.Types.ObjectId.isValid(req.query.category)) {
            return res.status(400).json({ success: false, message: 'Invalid category ID format' });
          }
          const categoryId = new mongoose.Types.ObjectId(req.query.category);
          andFilters.push({ category: categoryId });
        }
        if (req.query.minPrice || req.query.maxPrice) {
          andFilters.push({
            price: { $gte: Number(req.query.minPrice || 0), $lte: Number(req.query.maxPrice || Infinity) }
          });
        }

        const solarQuery = andFilters.length > 0 ? { $and: andFilters } : {};

        // Fetch all solar models
        const [solarPCUProducts, solarPVProducts, solarStreetLightProducts] = await Promise.all([
          SolarPCU.find(solarQuery).populate('brand', 'name logo').populate('category', 'name').sort({ createdAt: -1 }).skip(startIndex).limit(limit).lean(),
          SolarPV.find(solarQuery).populate('brand', 'name logo').populate('category', 'name').sort({ createdAt: -1 }).skip(startIndex).limit(limit).lean(),
          SolarStreetLight.find(solarQuery).populate('brand', 'name logo').populate('category', 'name').sort({ createdAt: -1 }).skip(startIndex).limit(limit).lean()
        ]);

     
        const [solarPCUCount, solarPVCount, solarStreetLightCount] = await Promise.all([
          SolarPCU.countDocuments(solarQuery),
          SolarPV.countDocuments(solarQuery),
          SolarStreetLight.countDocuments(solarQuery)
        ]);
        total = solarPCUCount + solarPVCount + solarStreetLightCount;

        // Add prodType
        const solarPCUWithType = solarPCUProducts.map(product => ({ ...product, prodType: 'solar-pcu' }));
        const solarPVWithType = solarPVProducts.map(product => ({ ...product, prodType: 'solar-pv' }));
        const solarStreetLightWithType = solarStreetLightProducts.map(product => ({ ...product, prodType: 'solar-street-light' }));

        products = [...solarPCUWithType, ...solarPVWithType, ...solarStreetLightWithType];

        // Review stats
        if (products.length > 0) {
          const productIds = products.map(p => p._id);
          const reviewStats = await Review.aggregate([
            { $match: { product: { $in: productIds } } },
            {
              $group: {
                _id: '$product',
                averageRating: { $avg: '$rating' },
                reviewCount: { $sum: 1 }
              }
            }
          ]);
          const statsMap = reviewStats.reduce((map, item) => {
            map[item._id.toString()] = item;
            return map;
          }, {});
          products = products.map(product => {
            const stats = statsMap[product._id.toString()];
            return {
              ...product,
              averageRating: stats ? stats.averageRating : 0,
              reviewCount: stats ? stats.reviewCount : 0,
            };
          });
        }
      } 
      // ------------------ SINGLE MODEL BLOCK ------------------
      else {
    
        let Model;
        switch (productType) {
          case 'ups': Model = UPS; break;
          case 'inverter': Model = Inverter; break;
          case 'battery': Model = Battery; break;
          case 'solar-pcu': Model = SolarPCU; break;
          case 'solar-pv': Model = SolarPV; break;
          case 'solar-street-light': Model = SolarStreetLight; break;
          default:
            return res.status(400).json({ success: false, message: 'Invalid product type' });
        }
        const andFilters = [];
        if (req.query.brand) {
          if (!mongoose.Types.ObjectId.isValid(req.query.brand)) {
            return res.status(400).json({ success: false, message: 'Invalid brand ID format' });
          }
          const brandId = new mongoose.Types.ObjectId(req.query.brand);
          andFilters.push({ brand: brandId });
        }
        if (req.query.category) {
          if (!mongoose.Types.ObjectId.isValid(req.query.category)) {
            return res.status(400).json({ success: false, message: 'Invalid category ID format' });
          }
          const categoryId = new mongoose.Types.ObjectId(req.query.category);
          andFilters.push({ category: categoryId });
        }
        if (req.query.minPrice || req.query.maxPrice) {
          andFilters.push({
            $or: [
              { sellingPrice: { $gte: Number(req.query.minPrice || 0), $lte: Number(req.query.maxPrice || Infinity) } },
              { mrp: { $gte: Number(req.query.minPrice || 0), $lte: Number(req.query.maxPrice || Infinity) } }
            ]
          });
        }
        if (andFilters.length > 0) query.$and = andFilters;
        total = await Model.countDocuments(query);
        products = await Model.find(query)
          .populate('brand', 'name logo')
          .populate('category', 'name')
          .sort({ createdAt: -1 })
          .skip(startIndex)
          .limit(limit)
          .lean();
        products = products.map(product => ({ ...product, prodType: productType }));

        if (products.length > 0) {
          const productIds = products.map(p => p._id);
          const reviewStats = await Review.aggregate([
            { $match: { product: { $in: productIds } } },
            {
              $group: {
                _id: '$product',
                averageRating: { $avg: '$rating' },
                reviewCount: { $sum: 1 }
              }
            }
          ]);
          const statsMap = reviewStats.reduce((map, item) => {
            map[item._id.toString()] = item;
            return map;
          }, {});
          products = products.map(product => {
            const stats = statsMap[product._id.toString()];
            return {
              ...product,
              averageRating: stats ? stats.averageRating : 0,
              reviewCount: stats ? stats.reviewCount : 0,
            };
          });
        }
      }
    } 
    // =============== NO TYPE: ALL MODELS BLOCK ===============
    else {
      const andFilters = [];
      if (req.query.brand) {
        if (!mongoose.Types.ObjectId.isValid(req.query.brand)) {
          return res.status(400).json({ success: false, message: 'Invalid brand ID format' });
        }
        const brandId = new mongoose.Types.ObjectId(req.query.brand);
        andFilters.push({ brand: brandId }); // ALWAYS use ObjectId
      }
      if (req.query.category) {
        if (!mongoose.Types.ObjectId.isValid(req.query.category)) {
          return res.status(400).json({ success: false, message: 'Invalid category ID format' });
        }
        const categoryId = new mongoose.Types.ObjectId(req.query.category);
        andFilters.push({ category: categoryId }); // ALWAYS use ObjectId
      }
      if (req.query.minPrice || req.query.maxPrice) {
        andFilters.push({
          $or: [
            { sellingPrice: { $gte: Number(req.query.minPrice || 0), $lte: Number(req.query.maxPrice || Infinity) } },
            { mrp: { $gte: Number(req.query.minPrice || 0), $lte: Number(req.query.maxPrice || Infinity) } }
          ]
        });
      }
      if (andFilters.length > 0) query.$and = andFilters;
      const productPromises = [
        UPS.find(query).populate('brand', 'name logo').populate('category', 'name').lean(),
        SolarPCU.find(query).populate('brand', 'name logo').populate('category', 'name').lean(),
        SolarPV.find(query).populate('brand', 'name logo').populate('category', 'name').lean(),
        SolarStreetLight.find(query).populate('brand', 'name logo').populate('category', 'name').lean(),
        Inverter.find(query).populate('brand', 'name logo').populate('category', 'name').lean(),
        Battery.find(query).populate('brand', 'name logo').populate('category', 'name').lean()
      ];
      const typeMap = ['ups', 'solar-pcu', 'solar-pv', 'solar-street-light', 'inverter', 'battery'];
      const productArrays = await Promise.all(productPromises);
      let allProducts = [];
      productArrays.forEach((arr, idx) => {
        const productsWithType = arr.map(product => ({ ...product, prodType: typeMap[idx] }));
        allProducts.push(...productsWithType);
      });
      if (allProducts.length > 0) {
        const productIds = allProducts.map(p => p._id);
        const reviewStats = await Review.aggregate([
          { $match: { product: { $in: productIds } } },
          {
            $group: {
              _id: '$product',
              averageRating: { $avg: '$rating' },
              reviewCount: { $sum: 1 }
            }
          }
        ]);
        const statsMap = reviewStats.reduce((map, item) => {
          map[item._id.toString()] = item;
          return map;
        }, {});
        allProducts = allProducts.map(product => {
          const stats = statsMap[product._id.toString()];
          return {
            ...product,
            averageRating: stats ? stats.averageRating : 0,
            reviewCount: stats ? stats.reviewCount : 0,
          };
        });
      }
      total = allProducts.length;
      products = allProducts.slice(startIndex, startIndex + limit);
    }

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('brand', 'name logo')
      .populate('category', 'name')
      .populate('compatibleWith', 'name mainImage price');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      discountPrice,
      stock,
      brand,
      images,
      mainImage,
      productType,
      category,
      weight,
      dimensions,
      warranty,
      isActive,
      isFeatured,
      batteryDetails,
      solarDetails,
      specifications,
      features,
      compatibleWith
    } = req.body;

    // Check if product with this name already exists
    const existingProduct = await Product.findOne({ name });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: `Product ${name} already exists`
      });
    }

    // Create product
    const product = await Product.create({
      name,
      description,
      price,
      discountPrice,
      stock,
      brand,
      images,
      mainImage,
      productType,
      category,
      weight,
      dimensions,
      warranty,
      isActive,
      isFeatured,
      batteryDetails,
      solarDetails,
      specifications,
      features,
      compatibleWith
    });

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if name is being changed and if it already exists
    if (req.body.name && req.body.name !== product.name) {
      const existingProduct = await Product.findOne({
        name: req.body.name,
        _id: { $ne: req.params.id }
      });

      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: `Product ${req.body.name} already exists`
        });
      }
    }

    // Update product
    product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Toggle product status (activate/deactivate)
// @route   PUT /api/products/:id/status
// @access  Private/Admin
exports.toggleProductStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive },
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Toggle product featured status
// @route   PUT /api/products/:id/featured
// @access  Private/Admin
exports.toggleProductFeatured = async (req, res) => {
  try {
    const { isFeatured } = req.body;

    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    product = await Product.findByIdAndUpdate(
      req.params.id,
      { isFeatured },
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    await product.remove();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
exports.getFeaturedProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 12) || 12;

    // Fetch featured products from all models
    const [ups, solarPCU, solarPV, solarStreetLight, inverter, battery] = await Promise.all([
      UPS.find({ isFeatured: true }).populate('brand', 'name logo').populate('category', 'name').sort({ createdAt: -1 }).limit(limit),
      SolarPCU.find({ isFeatured: true }).populate('brand', 'name logo').populate('category', 'name').sort({ createdAt: -1 }).limit(limit),
      SolarPV.find({ isFeatured: true }).populate('brand', 'name logo').populate('category', 'name').sort({ createdAt: -1 }).limit(limit),
      SolarStreetLight.find({ isFeatured: true }).populate('brand', 'name logo').populate('category', 'name').sort({ createdAt: -1 }).limit(limit),
      Inverter.find({ isFeatured: true }).populate('brand', 'name logo').populate('category', 'name').sort({ createdAt: -1 }).limit(limit),
      Battery.find({ isFeatured: true }).populate('brand', 'name logo').populate('category', 'name').sort({ createdAt: -1 }).limit(limit),
    ]);

    // Merge and sort all products by createdAt desc, then take top 20
    const allProducts = [...ups, ...solarPCU, ...solarPV, ...solarStreetLight, ...inverter, ...battery]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);

    res.status(200).json({
      success: true,
      count: allProducts.length,
      data: allProducts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// @desc    Get related products
// @route   GET /api/products/:id/related
// @access  Public
exports.getRelatedProducts = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const limit = parseInt(req.query.limit, 10) || 4;

    // Find products with same category or compatible with this product
    const relatedProducts = await Product.find({
      $or: [
        { category: product.category },
        { compatibleWith: product._id },
        { _id: { $in: product.compatibleWith } }
      ],
      _id: { $ne: product._id }, // Exclude current product
      isActive: true
    })
      .populate('brand', 'name logo')
      .populate('category', 'name')
      .limit(limit);

    res.status(200).json({
      success: true,
      count: relatedProducts.length,
      data: relatedProducts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// Get all products with filters
exports.getAllProducts = async (req, res) => {
  try {
    const { type, brand, category, minPrice, maxPrice, search } = req.query;

    // Build filter object
    const filter = {};
    if (brand) filter.brand = brand;
    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.$or = [
        { sellingPrice: { $gte: minPrice || 0, $lte: maxPrice || Infinity } },
        { mrp: { $gte: minPrice || 0, $lte: maxPrice || Infinity } }
      ];
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Get products based on type
    let products = [];
    
    // Special handling for solar products - check all solar models if type starts with 'solar'
    if (type && type.startsWith('solar')) {
  
      // Get products from all solar models
      const [solarPCU, solarPV, solarStreetLight] = await Promise.all([
        SolarPCU.find(filter).populate('brand category'),
        SolarPV.find(filter).populate('brand category'),
        SolarStreetLight.find(filter).populate('brand category')
      ]);
      
      // Add type information to each product
      const solarPCUWithType = solarPCU.map(p => ({ ...p.toObject(), prodType: 'solar-pcu' }));
      const solarPVWithType = solarPV.map(p => ({ ...p.toObject(), prodType: 'solar-pv' }));
      const solarStreetLightWithType = solarStreetLight.map(p => ({ ...p.toObject(), prodType: 'solar-street-light' }));
      
      // Combine all solar products
      products = [...solarPCUWithType, ...solarPVWithType, ...solarStreetLightWithType];
    } else {
      // Handle non-solar product types normally
      switch (type) {
        case 'ups':
          products = await UPS.find(filter).populate('brand category');
          products = products.map(p => ({ ...p.toObject(), prodType: 'ups' }));
          break;
        case 'solar-pcu':
          products = await SolarPCU.find(filter).populate('brand category');
          products = products.map(p => ({ ...p.toObject(), prodType: 'solar-pcu' }));
          break;
        case 'solar-pv':
          products = await SolarPV.find(filter).populate('brand category');
          products = products.map(p => ({ ...p.toObject(), prodType: 'solar-pv' }));
          break;
        case 'solar-street-light':
          products = await SolarStreetLight.find(filter).populate('brand category');
          products = products.map(p => ({ ...p.toObject(), prodType: 'solar-street-light' }));
          break;
        case 'inverter':
          products = await Inverter.find(filter).populate('brand category');
          products = products.map(p => ({ ...p.toObject(), prodType: 'inverter' }));
          break;
        case 'battery':
          products = await Battery.find(filter).populate('brand category');
          products = products.map(p => ({ ...p.toObject(), prodType: 'battery' }));
          break;
        default:
          // Get all products
          const [ups, solarPCU, solarPV, solarStreetLight, inverter, battery] = await Promise.all([
            UPS.find(filter).populate('brand category'),
            SolarPCU.find(filter).populate('brand category'),
            SolarPV.find(filter).populate('brand category'),
            SolarStreetLight.find(filter).populate('brand category'),
            Inverter.find(filter).populate('brand category'),
            Battery.find(filter).populate('brand category')
          ]);
          
          // Add type information to each product
          const upsWithType = ups.map(p => ({ ...p.toObject(), prodType: 'ups' }));
          const solarPCUWithType = solarPCU.map(p => ({ ...p.toObject(), prodType: 'solar-pcu' }));
          const solarPVWithType = solarPV.map(p => ({ ...p.toObject(), prodType: 'solar-pv' }));
          const solarStreetLightWithType = solarStreetLight.map(p => ({ ...p.toObject(), prodType: 'solar-street-light' }));
          const inverterWithType = inverter.map(p => ({ ...p.toObject(), prodType: 'inverter' }));
          const batteryWithType = battery.map(p => ({ ...p.toObject(), prodType: 'battery' }));
          
          products = [...upsWithType, ...solarPCUWithType, ...solarPVWithType, ...solarStreetLightWithType, ...inverterWithType, ...batteryWithType];
      }
    }

    // Get unique brands and categories for filters
    const brands = await Brand.find();
    const categories = await Category.find();

    res.json({
      products,
      filters: {
        brands,
        categories
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single product by ID and type
exports.getProductById = async (req, res) => {
  try {
    const { id, type } = req.params;
    let Model;

    switch (type) {
      case 'ups':
        Model = UPS;
        break;
      case 'solar-pcu':
        Model = SolarPCU;
        break;
      case 'solar-pv':
        Model = SolarPV;
        break;
      case 'solar-street-light':
        Model = SolarStreetLight;
        break;
      case 'inverter':
        Model = Inverter;
        break;
      case 'battery':
        Model = Battery;
        break;
      default:
        return res.status(400).json({ message: 'Invalid product type' });
    }

    let product = await Model.findById(id).populate('brand category').lean();

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Calculate review statistics
    const reviewStats = await Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: '$product',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 }
        }
      }
    ]);

    const stats = reviewStats[0] || { averageRating: 0, reviewCount: 0 };
    product.averageRating = stats.averageRating;
    product.reviewCount = stats.reviewCount;

    // Fetch the actual reviews for the product
    const reviews = await Review.find({ product: new mongoose.Types.ObjectId(id) })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    product.reviews = reviews;

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get filter options
exports.getFilterOptions = async (req, res) => {
  try {
    const brands = await Brand.find();
    const categories = await Category.find();

    res.json({
      brands,
      categories
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Test brand filtering
exports.testBrandFilter = async (req, res) => {
  try {
    const { brandId, type } = req.query;

    if (!brandId) {
      return res.status(400).json({ message: 'Brand ID is required' });
    }

    // Convert string ID to ObjectId for proper MongoDB comparison
    if (!mongoose.Types.ObjectId.isValid(brandId)) {
      return res.status(400).json({ message: 'Invalid brand ID format' });
    }
    const brandObjectId = new mongoose.Types.ObjectId(brandId);

    let Model;
    if (type) {
      switch (type) {
        case 'ups':
          Model = UPS;
          break;
        case 'solar-pcu':
          Model = SolarPCU;
          break;
        case 'solar-pv':
          Model = SolarPV;
          break;
        case 'solar-street-light':
          Model = SolarStreetLight;
          break;
        case 'inverter':
          Model = Inverter;
          break;
        case 'battery':
          Model = Battery;
          break;
        default:
          return res.status(400).json({ message: 'Invalid product type' });
      }
    } else {
      // Test all models
      const results = {};
      const models = [
        { name: 'UPS', model: UPS },
        { name: 'SolarPCU', model: SolarPCU },
        { name: 'SolarPV', model: SolarPV },
        { name: 'SolarStreetLight', model: SolarStreetLight },
        { name: 'Inverter', model: Inverter },
        { name: 'Battery', model: Battery }
      ];

      for (const { name, model } of models) {
        const count = await model.countDocuments({ brand: brandObjectId });
        const sample = await model.findOne({ brand: brandObjectId }).populate('brand', 'name');
        results[name] = {
          count,
          sample: sample ? {
            id: sample._id,
            name: sample.name,
            brand: sample.brand?.name
          } : null
        };
      }

      return res.json({
        brandId,
        brandObjectId: brandObjectId.toString(),
        results
      });
    }

    const count = await Model.countDocuments({ brand: brandObjectId });
    const sample = await Model.findOne({ brand: brandObjectId }).populate('brand', 'name');

    res.json({
      brandId,
      brandObjectId: brandObjectId.toString(),
      type,
      count,
      sample: sample ? {
        id: sample._id,
        name: sample.name,
        brand: sample.brand?.name
      } : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};