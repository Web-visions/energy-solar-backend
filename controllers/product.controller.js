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
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const search = req.query.search || '';
    const productType = req.query.type;

    let query = {};
    let products = [];
    let total = 0;

    // Text search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const buildFilters = () => {
      const andFilters = [];
    
      // Brand filter
      if (req.query.brand && mongoose.Types.ObjectId.isValid(req.query.brand)) {
        andFilters.push({ brand: new mongoose.Types.ObjectId(req.query.brand) });
      }
    
     if (
  productType === "battery" &&
  req.query.subcategory &&
  typeof req.query.subcategory === "string"
) {
  andFilters.push({ subcategory: req.query.subcategory });
}

    
      // Battery type filter (was missing in your latest code)
      if (req.query.batteryType && productType === 'battery') {
        andFilters.push({ batteryType: req.query.batteryType });
      }
    
      // Price range filter (enhanced for battery products)
      if (req.query.minPrice || req.query.maxPrice) {
        const min = Number(req.query.minPrice || 0);
        const max = Number(req.query.maxPrice || Infinity);
        
        if (productType === 'battery') {
          // For batteries, check all price fields including battery exchange prices
          andFilters.push({
            $or: [
              { price: { $gte: min, $lte: max } },
              { mrp: { $gte: min, $lte: max } },
              { sellingPrice: { $gte: min, $lte: max } },
              { priceWithoutOldBattery: { $gte: min, $lte: max } },
              { priceWithOldBattery: { $gte: min, $lte: max } }
            ]
          });
        } else {
          // For non-battery products
          andFilters.push({
            $or: [
              { price: { $gte: min, $lte: max } },
              { mrp: { $gte: min, $lte: max } },
              { sellingPrice: { $gte: min, $lte: max } }
            ]
          });
        }
      }
    
      // Capacity range filter (new implementation with error handling)
      if (req.query.capacityRange) {
        try {
          const [min, max] = req.query.capacityRange.split('-').map(Number);
          
          // Validate that we got valid numbers
          if (isNaN(min) || isNaN(max)) {
            throw new Error('Invalid capacity range format');
          }
          
          if (productType === 'battery') {
            if (max === 999) {
              // For "> 200Ah" case
              andFilters.push({ AH: { $gt: min } });
            } else {
              andFilters.push({ AH: { $gte: min, $lte: max } });
            }
          } else if (productType === 'inverter') {
            if (max === 999999) {
              // For "> 5KVA" case  
              andFilters.push({ capacity: { $gt: min } });
            } else {
              andFilters.push({ capacity: { $gte: min, $lte: max } });
            }
          }
        } catch (error) {
          // You might want to handle this error or return early
          console.error('Invalid capacity range format:', req.query.capacityRange);
        }
      }
    
      return andFilters;
    };
    
    

    const appendReviewStats = async (products) => {
      const productIds = products.map(p => p._id);
      const stats = await Review.aggregate([
        { $match: { product: { $in: productIds } } },
        {
          $group: {
            _id: '$product',
            averageRating: { $avg: '$rating' },
            reviewCount: { $sum: 1 }
          }
        }
      ]);
      const statsMap = Object.fromEntries(stats.map(stat => [stat._id.toString(), stat]));
      return products.map(p => ({
        ...p,
        averageRating: statsMap[p._id.toString()]?.averageRating || 0,
        reviewCount: statsMap[p._id.toString()]?.reviewCount || 0
      }));
    };

    // === TYPE SPECIFIED ===
    if (productType) {
      const filters = buildFilters();

      // --- MULTIPLE SOLAR MODELS ---
      if (productType.startsWith('solar')) {
        const solarQuery = filters.length ? { $and: filters } : {};

        const [solarPCU, solarPV, solarStreetLight] = await Promise.all([
          SolarPCU.find(solarQuery).populate('brand category').sort({ createdAt: -1 }).skip(startIndex).limit(limit).lean(),
          SolarPV.find(solarQuery).populate('brand category').sort({ createdAt: -1 }).skip(startIndex).limit(limit).lean(),
          SolarStreetLight.find(solarQuery).populate('brand category').sort({ createdAt: -1 }).skip(startIndex).limit(limit).lean()
        ]);

        const [count1, count2, count3] = await Promise.all([
          SolarPCU.countDocuments(solarQuery),
          SolarPV.countDocuments(solarQuery),
          SolarStreetLight.countDocuments(solarQuery)
        ]);

        total = count1 + count2 + count3;

        const solarPCUWithType = solarPCU.map(p => ({ ...p, prodType: 'solar-pcu' }));
        const solarPVWithType = solarPV.map(p => ({ ...p, prodType: 'solar-pv' }));
        const solarStreetWithType = solarStreetLight.map(p => ({ ...p, prodType: 'solar-street-light' }));

        products = [...solarPCUWithType, ...solarPVWithType, ...solarStreetWithType];
        products = await appendReviewStats(products);
      } else {
        // --- SINGLE MODEL BLOCK ---
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

        const filters = buildFilters();
        const productQuery = filters.length ? { $and: filters } : {};

        if (query.$or) {
          if (productQuery.$and) {
            productQuery.$and.push({ $or: query.$or });
          } else {
            productQuery.$and = [{ $or: query.$or }];
          }
        }

        total = await Model.countDocuments(productQuery);
        products = await Model.find(productQuery)
          .populate('brand category')
          .sort({ createdAt: -1 })
          .skip(startIndex)
          .limit(limit)
          .lean();

        products = products.map(p => ({ ...p, prodType: productType }));
        products = await appendReviewStats(products);
      }
    } else {
      // === TYPE NOT SPECIFIED ===
      const filters = buildFilters();
      if (filters.length) query.$and = filters;

      const productTypes = [
        { model: UPS, type: 'ups' },
        { model: SolarPCU, type: 'solar-pcu' },
        { model: SolarPV, type: 'solar-pv' },
        { model: SolarStreetLight, type: 'solar-street-light' },
        { model: Inverter, type: 'inverter' },
        { model: Battery, type: 'battery' }
      ];

      const allProducts = [];

      for (const { model, type } of productTypes) {
        const data = await model.find(query).populate('brand category').lean();
        allProducts.push(...data.map(p => ({ ...p, prodType: type })));
      }

      total = allProducts.length;
      products = allProducts.slice(startIndex, startIndex + limit);
      products = await appendReviewStats(products);
    }

    return res.status(200).json({
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
    return res.status(500).json({
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