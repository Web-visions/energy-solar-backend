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
    const pageNumber = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.limit, 10) || 10;
    const offset = (pageNumber - 1) * pageSize;
    const searchText = req.query.search || '';
    const hasBatterySignals = Boolean(req.query.productLine || req.query.manufacturer || req.query.vehicleModel);
    // const effectiveType = hasBatterySignals ? 'battery' : req.query.type;
    const debugMode = req.query.debug === '1';


    const effectiveType = (req.query.type && String(req.query.type).toLowerCase() === 'battery')
      ? 'battery'
      : undefined;

    console.log('[products] incoming type:', req.query.type);
    console.log('[products] effectiveType:', effectiveType);

    const parseCapacityRange = (raw) => {
      if (!raw) return { min: null, max: null };
      const value = String(raw).trim();
      if (value.endsWith('+')) {
        const minPart = Number(value.slice(0, -1));
        return Number.isFinite(minPart) ? { min: minPart, max: null } : { min: null, max: null };
      }
      const [minStr, maxStr] = value.split('-');
      const minParsed = Number(minStr);
      const maxParsed = Number(maxStr);
      return {
        min: Number.isFinite(minParsed) ? minParsed : null,
        max: Number.isFinite(maxParsed) ? maxParsed : null
      };
    };

    const capacityFilter = parseCapacityRange(req.query.capacityRange);

    let textSearchClause = {};
    if (searchText) {
      textSearchClause.$or = [
        { name: { $regex: searchText, $options: 'i' } },
        { description: { $regex: searchText, $options: 'i' } }
      ];
    }

    const buildFiltersFor = (mode) => {
      const requiredClauses = [];
      const optionalFitmentClauses = [];

      if (req.query.brand && mongoose.Types.ObjectId.isValid(req.query.brand)) {
        requiredClauses.push({ brand: new mongoose.Types.ObjectId(req.query.brand) });
      }

      if (mode === 'battery') {
        if (req.query.productLine && mongoose.Types.ObjectId.isValid(req.query.productLine)) {
          requiredClauses.push({ productLine: new mongoose.Types.ObjectId(req.query.productLine) });
        }
        if (req.query.manufacturer && mongoose.Types.ObjectId.isValid(req.query.manufacturer)) {
          const manufacturerId = new mongoose.Types.ObjectId(req.query.manufacturer);
          optionalFitmentClauses.push({ $or: [{ manufacturer: manufacturerId }, { compatibleManufacturers: manufacturerId }] });
        }
        if (req.query.vehicleModel && mongoose.Types.ObjectId.isValid(req.query.vehicleModel)) {
          const modelId = new mongoose.Types.ObjectId(req.query.vehicleModel);
          optionalFitmentClauses.push({ $or: [{ vehicleModel: modelId }, { compatibleModels: modelId }] });
        }
        if (req.query.batteryType) {
          requiredClauses.push({ batteryType: req.query.batteryType });
        }
      } else {
        if (req.query.manufacturer && mongoose.Types.ObjectId.isValid(req.query.manufacturer)) {
          requiredClauses.push({ manufacturer: new mongoose.Types.ObjectId(req.query.manufacturer) });
        }
        if (req.query.vehicleModel && mongoose.Types.ObjectId.isValid(req.query.vehicleModel)) {
          requiredClauses.push({ vehicleModel: new mongoose.Types.ObjectId(req.query.vehicleModel) });
        }
        if (req.query.productLine && mongoose.Types.ObjectId.isValid(req.query.productLine)) {
          requiredClauses.push({ productLine: new mongoose.Types.ObjectId(req.query.productLine) });
        }
      }

      if (req.query.minPrice || req.query.maxPrice) {
        const minPrice = Number(req.query.minPrice || 0);
        const maxPrice = Number(req.query.maxPrice || Infinity);
        const priceOr = [
          { price: { $gte: minPrice, $lte: maxPrice } },
          { mrp: { $gte: minPrice, $lte: maxPrice } },
          { sellingPrice: { $gte: minPrice, $lte: maxPrice } }
        ];
        if (mode === 'battery') {
          priceOr.push({ priceWithoutOldBattery: { $gte: minPrice, $lte: maxPrice } });
          priceOr.push({ priceWithOldBattery: { $gte: minPrice, $lte: maxPrice } });
        }
        requiredClauses.push({ $or: priceOr });
      }

      if (mode === 'inverter') {
        if (capacityFilter.min != null && capacityFilter.max != null) {
          requiredClauses.push({ capacity: { $gte: capacityFilter.min, $lte: capacityFilter.max } });
        } else if (capacityFilter.min != null) {
          requiredClauses.push({ capacity: { $gte: capacityFilter.min } });
        }
      }

      return { requiredClauses, optionalFitmentClauses };
    };

    const appendReviewStats = async (docs) => {
      if (!docs.length) return [];
      const ids = docs.map(p => p._id);
      const stats = await Review.aggregate([
        { $match: { product: { $in: ids } } },
        { $group: { _id: '$product', averageRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } }
      ]);
      const map = Object.fromEntries(stats.map(s => [s._id.toString(), s]));
      return docs.map(p => ({
        ...p,
        averageRating: map[p._id.toString()]?.averageRating || 0,
        reviewCount: map[p._id.toString()]?.reviewCount || 0
      }));
    };

    if (effectiveType === 'battery') {
      console.log('[products] Using BATTERY branch');
      const { requiredClauses, optionalFitmentClauses } = buildFiltersFor('battery');
      console.log('[products] battery.requiredClauses:', JSON.stringify(requiredClauses, null, 2));
      console.log('[products] battery.optionalFitmentClauses:', JSON.stringify(optionalFitmentClauses, null, 2));

      const strictQuery = {};
      if (requiredClauses.length) strictQuery.$and = [...requiredClauses];
      if (optionalFitmentClauses.length === 1) {
        strictQuery.$and = strictQuery.$and || [];
        strictQuery.$and.push(optionalFitmentClauses[0]);
      } else if (optionalFitmentClauses.length > 1) {
        strictQuery.$and = strictQuery.$and || [];
        strictQuery.$and.push({ $or: optionalFitmentClauses });
      }
      if (textSearchClause.$or) {
        strictQuery.$and = strictQuery.$and || [];
        strictQuery.$and.push({ $or: textSearchClause.$or });
      }

      let total = await Battery.countDocuments(strictQuery);
      let docs = await Battery.find(strictQuery)
        .populate('brand category')
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(pageSize)
        .lean();

      if (total === 0) {
        const relaxedQuery = {};
        if (requiredClauses.length) relaxedQuery.$and = [...requiredClauses];
        if (textSearchClause.$or) {
          relaxedQuery.$and = relaxedQuery.$and || [];
          relaxedQuery.$and.push({ $or: textSearchClause.$or });
        }
        total = await Battery.countDocuments(relaxedQuery);
        docs = await Battery.find(relaxedQuery)
          .populate('brand category')
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(pageSize)
          .lean();
        docs = docs.map(d => ({ ...d, prodType: 'battery', fitmentRelaxed: true }));
      } else {
        docs = docs.map(d => ({ ...d, prodType: 'battery', fitmentRelaxed: false }));
      }

      docs = await appendReviewStats(docs);

      return res.status(200).json({
        success: true,
        count: docs.length,
        total,
        pagination: { page: pageNumber, limit: pageSize, totalPages: Math.ceil(total / pageSize) || 1 },
        data: docs
      });
    } else {
      console.log('[products] Using GENERIC branch (all models)');
      const genericClauses = buildFiltersFor(undefined).requiredClauses;
      console.log('[products] generic.requiredClauses:', JSON.stringify(genericClauses, null, 2));

      const baseQueryWithoutCapacity = genericClauses.length ? { $and: genericClauses } : {};
      if (textSearchClause.$or) {
        baseQueryWithoutCapacity.$and = baseQueryWithoutCapacity.$and || [];
        baseQueryWithoutCapacity.$and.push({ $or: textSearchClause.$or });
      }
      console.log('[products] generic.baseQuery:', JSON.stringify(baseQueryWithoutCapacity, null, 2));

      const modelMatrix = [
        { model: UPS, type: 'ups', capacityField: 'outputPowerWattage' },
        { model: SolarPCU, type: 'solar-pcu', capacityField: 'wattage' },
        { model: SolarPV, type: 'solar-pv', capacityField: null },
        { model: SolarStreetLight, type: 'solar-street-light', capacityField: 'power' },
        { model: Inverter, type: 'inverter', capacityField: 'capacity' },
        { model: Battery, type: 'battery', capacityField: null }
      ];

      const allDocs = [];
      for (const { model, type, capacityField } of modelMatrix) {
        let modelQuery = JSON.parse(JSON.stringify(baseQueryWithoutCapacity));
        if (capacityField && capacityFilter.min != null) {
          const capacityClause = capacityFilter.max != null
            ? { [capacityField]: { $gte: capacityFilter.min, $lte: capacityFilter.max } }
            : { [capacityField]: { $gte: capacityFilter.min } };
          modelQuery.$and = modelQuery.$and || [];
          modelQuery.$and.push(capacityClause);
        }
        console.log(`[products] model=${type}, modelQuery=`, JSON.stringify(modelQuery, null, 2));
        const docs = await model.find(modelQuery).populate('brand category').lean();
        console.log(`[products] model=${type}, found=`, docs.length);
        allDocs.push(...docs.map(p => ({ ...p, prodType: type })));
      }

      const total = allDocs.length;
      const pageDocs = allDocs.slice(offset, offset + pageSize);
      const enriched = await appendReviewStats(pageDocs);

      return res.status(200).json({
        success: true,
        count: enriched.length,
        total,
        pagination: { page: pageNumber, limit: pageSize, totalPages: Math.ceil(total / pageSize) || 1 },
        data: enriched
      });
    }

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server Error' });
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