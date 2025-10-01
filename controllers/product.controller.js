const Product = require("../models/product.model");
const mongoose = require("mongoose");
const UPS = require("../models/ups.model");
const SolarPCU = require("../models/solor-pcu.model");
const SolarPV = require("../models/solor-pv.model");
const SolarPVModule = require("../models/solor-pv.model");
const SolarStreetLight = require("../models/solor-street-light.model");
const Inverter = require("../models/inverter.model");
const Battery = require("../models/battery");
const Brand = require("../models/brand.model");
const Category = require("../models/category.model");
const Review = require("../models/Review");

// @desc    Get all products with pagination, search, and filtering
// @route   GET /api/products

exports.getProducts = async (req, res) => {
  try {
    const pageNumber = Number.parseInt(req.query.page, 10) || 1;
    const pageSize = Number.parseInt(req.query.limit, 10) || 10;
    const offset = (pageNumber - 1) * pageSize;

    const searchText = req.query.search || "";
    const normalizedType = (req.query.type || "").toLowerCase();
    const productLineName = req.query.productLineName || ""; // ✅ Get productLineName
    const strictFitment = String(req.query.strictFitment || "").toLowerCase() === "true";

    const hasManufacturerSignal = Boolean(req.query.manufacturer);
    const hasVehicleModelSignal = Boolean(req.query.vehicleModel);
    const hasFitmentSignals = hasManufacturerSignal || hasVehicleModelSignal;

    // ✅ Determine effective type from productLineName
    const BATTERY_PRODUCT_LINES = [
      "2 Wheeler Batteries",
      "Four Wheeler Batteries", 
      "Truck Batteries",
      "Genset Batteries",
      "Inverter Batteries",
      "SMF/VRLA Batteries",
      "Solar Batteries"
    ];

    const INVERTER_PRODUCT_LINES = [
      "Inverter",
      "Inverter & Battery Combo",
      "Solar Inverters"
    ];

    const UPS_PRODUCT_LINES = [
      "Online UPS",
      "Inverter & UPS System"
    ];

    const SOLAR_PCU_PRODUCT_LINES = [
      "Solar Energy Solutions"
    ];

    let effectiveType = normalizedType;

    // If productLineName is provided, override effectiveType
    if (productLineName) {
      if (BATTERY_PRODUCT_LINES.includes(productLineName)) {
        effectiveType = "battery";
      } else if (INVERTER_PRODUCT_LINES.includes(productLineName)) {
        effectiveType = "inverter";
      } else if (UPS_PRODUCT_LINES.includes(productLineName)) {
        effectiveType = "ups";
      } else if (SOLAR_PCU_PRODUCT_LINES.includes(productLineName)) {
        effectiveType = "solar-pcu";
      }
    } else if (hasFitmentSignals) {
      // Fallback: if manufacturer/vehicleModel present, assume battery
      effectiveType = "battery";
    }

    const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);
    const toObjectId = (value) => new mongoose.Types.ObjectId(value);

    const parseIdList = (raw) => {
      if (!raw) return [];
      const rawList = Array.isArray(raw) ? raw.flatMap(r => String(r).split(',')) : String(raw).split(',');
      const cleaned = rawList
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && isValidObjectId(s))
        .map((s) => toObjectId(s));
      return cleaned;
    };

    const parseRange = (raw) => {
      if (!raw) return { min: null, max: null };
      const s = String(raw).trim();
      if (s.endsWith("+")) {
        const minPart = Number(s.slice(0, -1));
        return Number.isFinite(minPart) ? { min: minPart, max: null } : { min: null, max: null };
      }
      const [minStr, maxStr] = s.split("-");
      const min = Number(minStr);
      const max = Number(maxStr);
      return { min: Number.isFinite(min) ? min : null, max: Number.isFinite(max) ? max : null };
    };

    const capacityRange = parseRange(req.query.capacityRange);

    const explicitAhMin =
      req.query.minAH !== undefined && req.query.minAH !== "" ? Number(req.query.minAH) : null;
    const explicitAhMax =
      req.query.maxAH !== undefined && req.query.maxAH !== "" ? Number(req.query.maxAH) : null;
    const hasExplicitAh = explicitAhMin != null || explicitAhMax != null;
    const hasCapacityRange = capacityRange.min != null || capacityRange.max != null;

    const textSearchClause = searchText
      ? {
          $or: [
            { name: { $regex: searchText, $options: "i" } },
            { description: { $regex: searchText, $options: "i" } },
          ],
        }
      : {};

    const buildPriceClause = (min, max, mode) => {
      const hasMin = min !== undefined && min !== "";
      const hasMax = max !== undefined && max !== "";
      if (!hasMin && !hasMax) return null;
      const priceRange = {};
      if (hasMin) priceRange.$gte = Number(min);
      if (hasMax) priceRange.$lte = Number(max);
      const priceOr = [{ price: priceRange }, { mrp: priceRange }, { sellingPrice: priceRange }];
      if (mode === "battery") {
        priceOr.push({ priceWithoutOldBattery: priceRange }, { priceWithOldBattery: priceRange });
      }
      return { $or: priceOr };
    };

    const buildFiltersFor = (mode) => {
      const requiredClauses = [];
      const optionalFitmentClauses = [];

      const pushRequired = (clause) => requiredClauses.push(clause);
      const pushOptionalFitment = (clause) => optionalFitmentClauses.push(clause);

      if (req.query.brand) {
        if (isValidObjectId(req.query.brand)) pushRequired({ brand: toObjectId(req.query.brand) });
      }

      if (req.query.category) {
        if (isValidObjectId(req.query.category)) pushRequired({ category: toObjectId(req.query.category) });
      }

      if (req.query.productLine) {
        if (isValidObjectId(req.query.productLine)) pushRequired({ productLine: toObjectId(req.query.productLine) });
      }

      if (mode === "battery") {
        const manufacturerIds = parseIdList(req.query.manufacturer);
        const vehicleModelIds = parseIdList(req.query.vehicleModel);

        if (manufacturerIds.length) {
          const manufacturerClause = {
            $or: [
              { manufacturer: { $in: manufacturerIds } },
              { compatibleManufacturers: { $in: manufacturerIds } },
            ],
          };
          if (strictFitment) pushRequired(manufacturerClause);
          else pushOptionalFitment(manufacturerClause);
        }

        if (vehicleModelIds.length) {
          const vehicleModelClause = {
            $or: [
              { vehicleModel: { $in: vehicleModelIds } },
              { compatibleModels: { $in: vehicleModelIds } },
            ],
          };
          if (strictFitment) pushRequired(vehicleModelClause);
          else pushOptionalFitment(vehicleModelClause);
        }

        if (req.query.batteryType) {
          pushRequired({ batteryType: req.query.batteryType });
        }

        if (hasExplicitAh) {
          if (explicitAhMin != null && explicitAhMax != null) {
            pushRequired({ AH: { $gte: explicitAhMin, $lte: explicitAhMax } });
          } else if (explicitAhMin != null) {
            pushRequired({ AH: { $gte: explicitAhMin } });
          } else if (explicitAhMax != null) {
            pushRequired({ AH: { $lte: explicitAhMax } });
          }
        } else if (hasCapacityRange) {
          if (capacityRange.min != null && capacityRange.max != null) {
            pushRequired({ AH: { $gte: capacityRange.min, $lte: capacityRange.max } });
          } else if (capacityRange.min != null) {
            pushRequired({ AH: { $gte: capacityRange.min } });
          } else if (capacityRange.max != null) {
            pushRequired({ AH: { $lte: capacityRange.max } });
          }
        }
      }

      const priceClause = buildPriceClause(req.query.minPrice, req.query.maxPrice, mode);
      if (priceClause) pushRequired(priceClause);

      return { requiredClauses, optionalFitmentClauses };
    };

    const appendReviewStats = async (documents) => {
      if (!documents.length) return [];
      const productIds = documents.map((p) => p._id);
      const stats = await Review.aggregate([
        { $match: { product: { $in: productIds } } },
        { $group: { _id: "$product", averageRating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } },
      ]);
      const statsByProductId = Object.fromEntries(
        stats.map((s) => [s._id.toString(), s])
      );
      return documents.map((p) => ({
        ...p,
        averageRating: statsByProductId[p._id.toString()]?.averageRating || 0,
        reviewCount: statsByProductId[p._id.toString()]?.reviewCount || 0,
      }));
    };

    // ✅ Battery search
    if (effectiveType === "battery") {
      const { requiredClauses, optionalFitmentClauses } = buildFiltersFor("battery");

      const strictQuery = { $and: [] };
      if (requiredClauses.length) strictQuery.$and.push(...requiredClauses);

      if (!strictFitment && optionalFitmentClauses.length === 1) {
        strictQuery.$and.push(optionalFitmentClauses[0]);
      } else if (!strictFitment && optionalFitmentClauses.length > 1) {
        strictQuery.$and.push({ $and: optionalFitmentClauses });
      }

      if (textSearchClause.$or) strictQuery.$and.push(textSearchClause);
      if (strictQuery.$and.length === 0) delete strictQuery.$and;

      const finalQuery = strictQuery;
      const total = await Battery.countDocuments(finalQuery);

      let batteryDocs = await Battery.find(finalQuery)
        .populate("brand category productLine")
        .skip(offset)
        .limit(pageSize)
        .lean();

      batteryDocs = batteryDocs.map((d) => ({ ...d, prodType: "battery" }));
      const data = await appendReviewStats(batteryDocs);

      return res.json({
        success: true,
        count: data.length,
        total,
        pagination: {
          page: pageNumber,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize) || 1,
        },
         data,
      });
    }

    // ✅ Non-battery products (Inverter, UPS, Solar, etc.)
    const { requiredClauses: genericRequiredClauses } = buildFiltersFor(null);

    const genericBaseQuery = genericRequiredClauses.length ? { $and: [...genericRequiredClauses] } : {};
    if (textSearchClause.$or) {
      genericBaseQuery.$and = genericBaseQuery.$and || [];
      genericBaseQuery.$and.push(textSearchClause);
    }

    const fullGenericModelMatrix = [
      { model: UPS,              prodType: "ups",                capacityField: "outputPowerWattage" },
      { model: Inverter,         prodType: "inverter",           capacityField: "capacity" },
      { model: SolarPCU,         prodType: "solar-pcu",          capacityField: "wattage" },
      { model: SolarPVModule,    prodType: "solar-pv",           capacityField: null },
      { model: SolarStreetLight, prodType: "solar-street-light", capacityField: "power" },
    ];

    // ✅ Filter by effectiveType
    const genericModelMatrix =
      ["ups", "inverter", "solar-pcu", "solar-pv", "solar-street-light"].includes(effectiveType)
        ? fullGenericModelMatrix.filter((m) => m.prodType === effectiveType)
        : fullGenericModelMatrix;

   // Around line 270 - Replace the modelResults section
const modelResults = await Promise.all(
  genericModelMatrix.map(async ({ model, prodType, capacityField }) => {
    const modelQuery = genericBaseQuery.$and ? { $and: [...genericBaseQuery.$and] } : {};

    // ✅ Use capacityRange to filter by capacity field (handles both AH and VA)
    if (capacityField && hasCapacityRange) {
      if (capacityRange.min != null && capacityRange.max != null) {
        const capacityClause = { [capacityField]: { $gte: capacityRange.min, $lte: capacityRange.max } };
        modelQuery.$and = modelQuery.$and || [];
        modelQuery.$and.push(capacityClause);
      } else if (capacityRange.min != null) {
        const capacityClause = { [capacityField]: { $gte: capacityRange.min } };
        modelQuery.$and = modelQuery.$and || [];
        modelQuery.$and.push(capacityClause);
      } else if (capacityRange.max != null) {
        const capacityClause = { [capacityField]: { $lte: capacityRange.max } };
        modelQuery.$and = modelQuery.$and || [];
        modelQuery.$and.push(capacityClause);
      }
    }


    const documents = await model.find(modelQuery).populate("brand category productLine").lean();
    

    
    return documents.map((doc) => ({ ...doc, prodType }));
  })
);


    const aggregatedProducts = modelResults.flat();

    const totalFound = aggregatedProducts.length;
    const pagedDocuments = aggregatedProducts.slice(offset, offset + pageSize);
    const data = await appendReviewStats(pagedDocuments);

    return res.json({
      success: true,
      count: data.length,
      total: totalFound,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(totalFound / pageSize) || 1,
      },
       data,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};




// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("brand", "name logo")
      .populate("category", "name")
      .populate("compatibleWith", "name mainImage price");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server Error",
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
      compatibleWith,
    } = req.body;

    // Check if product with this name already exists
    const existingProduct = await Product.findOne({ name });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: `Product ${name} already exists`,
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
      compatibleWith,
    });

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server Error",
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
        message: "Product not found",
      });
    }

    // Check if name is being changed and if it already exists
    if (req.body.name && req.body.name !== product.name) {
      const existingProduct = await Product.findOne({
        name: req.body.name,
        _id: { $ne: req.params.id },
      });

      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: `Product ${req.body.name} already exists`,
        });
      }
    }

    // Update product
    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || "Server Error",
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
        message: "Product not found",
      });
    }

    product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive },
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || "Server Error",
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
        message: "Product not found",
      });
    }

    product = await Product.findByIdAndUpdate(
      req.params.id,
      { isFeatured },
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || "Server Error",
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
        message: "Product not found",
      });
    }

    await product.remove();

    res.status(200).json({
      success: true,
      data: {},
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || "Server Error",
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
    const [ups, solarPCU, solarPV, solarStreetLight, inverter, battery] =
      await Promise.all([
        UPS.find({ isFeatured: true })
          .populate("brand", "name logo")
          .populate("category", "name")
          .sort({ createdAt: -1 })
          .limit(limit),
        SolarPCU.find({ isFeatured: true })
          .populate("brand", "name logo")
          .populate("category", "name")
          .sort({ createdAt: -1 })
          .limit(limit),
        SolarPV.find({ isFeatured: true })
          .populate("brand", "name logo")
          .populate("category", "name")
          .sort({ createdAt: -1 })
          .limit(limit),
        SolarStreetLight.find({ isFeatured: true })
          .populate("brand", "name logo")
          .populate("category", "name")
          .sort({ createdAt: -1 })
          .limit(limit),
        Inverter.find({ isFeatured: true })
          .populate("brand", "name logo")
          .populate("category", "name")
          .sort({ createdAt: -1 })
          .limit(limit),
        Battery.find({ isFeatured: true })
          .populate("brand", "name logo")
          .populate("category", "name")
          .sort({ createdAt: -1 })
          .limit(limit),
      ]);

    // Merge and sort all products by createdAt desc, then take top 20
    const allProducts = [
      ...ups,
      ...solarPCU,
      ...solarPV,
      ...solarStreetLight,
      ...inverter,
      ...battery,
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);

    res.status(200).json({
      success: true,
      count: allProducts.length,
      data: allProducts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || "Server Error",
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
        message: "Product not found",
      });
    }

    const limit = parseInt(req.query.limit, 10) || 4;

    // Find products with same category or compatible with this product
    const relatedProducts = await Product.find({
      $or: [
        { category: product.category },
        { compatibleWith: product._id },
        { _id: { $in: product.compatibleWith } },
      ],
      _id: { $ne: product._id }, // Exclude current product
      isActive: true,
    })
      .populate("brand", "name logo")
      .populate("category", "name")
      .limit(limit);

    res.status(200).json({
      success: true,
      count: relatedProducts.length,
      data: relatedProducts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || "Server Error",
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
        { mrp: { $gte: minPrice || 0, $lte: maxPrice || Infinity } },
      ];
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Get products based on type
    let products = [];

    // Special handling for solar products - check all solar models if type starts with 'solar'
    if (type && type.startsWith("solar")) {
      // Get products from all solar models
      const [solarPCU, solarPV, solarStreetLight] = await Promise.all([
        SolarPCU.find(filter).populate("brand category"),
        SolarPV.find(filter).populate("brand category"),
        SolarStreetLight.find(filter).populate("brand category"),
      ]);

      // Add type information to each product
      const solarPCUWithType = solarPCU.map((p) => ({
        ...p.toObject(),
        prodType: "solar-pcu",
      }));
      const solarPVWithType = solarPV.map((p) => ({
        ...p.toObject(),
        prodType: "solar-pv",
      }));
      const solarStreetLightWithType = solarStreetLight.map((p) => ({
        ...p.toObject(),
        prodType: "solar-street-light",
      }));

      // Combine all solar products
      products = [
        ...solarPCUWithType,
        ...solarPVWithType,
        ...solarStreetLightWithType,
      ];
    } else {
      // Handle non-solar product types normally
      switch (type) {
        case "ups":
          products = await UPS.find(filter).populate("brand category");
          products = products.map((p) => ({
            ...p.toObject(),
            prodType: "ups",
          }));
          break;
        case "solar-pcu":
          products = await SolarPCU.find(filter).populate("brand category");
          products = products.map((p) => ({
            ...p.toObject(),
            prodType: "solar-pcu",
          }));
          break;
        case "solar-pv":
          products = await SolarPV.find(filter).populate("brand category");
          products = products.map((p) => ({
            ...p.toObject(),
            prodType: "solar-pv",
          }));
          break;
        case "solar-street-light":
          products = await SolarStreetLight.find(filter).populate(
            "brand category"
          );
          products = products.map((p) => ({
            ...p.toObject(),
            prodType: "solar-street-light",
          }));
          break;
        case "inverter":
          products = await Inverter.find(filter).populate("brand category");
          products = products.map((p) => ({
            ...p.toObject(),
            prodType: "inverter",
          }));
          break;
        case "battery":
          products = await Battery.find(filter).populate("brand category");
          products = products.map((p) => ({
            ...p.toObject(),
            prodType: "battery",
          }));
          break;
        default:
          // Get all products
          const [ups, solarPCU, solarPV, solarStreetLight, inverter, battery] =
            await Promise.all([
              UPS.find(filter).populate("brand category"),
              SolarPCU.find(filter).populate("brand category"),
              SolarPV.find(filter).populate("brand category"),
              SolarStreetLight.find(filter).populate("brand category"),
              Inverter.find(filter).populate("brand category"),
              Battery.find(filter).populate("brand category"),
            ]);

          // Add type information to each product
          const upsWithType = ups.map((p) => ({
            ...p.toObject(),
            prodType: "ups",
          }));
          const solarPCUWithType = solarPCU.map((p) => ({
            ...p.toObject(),
            prodType: "solar-pcu",
          }));
          const solarPVWithType = solarPV.map((p) => ({
            ...p.toObject(),
            prodType: "solar-pv",
          }));
          const solarStreetLightWithType = solarStreetLight.map((p) => ({
            ...p.toObject(),
            prodType: "solar-street-light",
          }));
          const inverterWithType = inverter.map((p) => ({
            ...p.toObject(),
            prodType: "inverter",
          }));
          const batteryWithType = battery.map((p) => ({
            ...p.toObject(),
            prodType: "battery",
          }));

          products = [
            ...upsWithType,
            ...solarPCUWithType,
            ...solarPVWithType,
            ...solarStreetLightWithType,
            ...inverterWithType,
            ...batteryWithType,
          ];
      }
    }

    // Get unique brands and categories for filters
    const brands = await Brand.find();
    const categories = await Category.find();

    res.json({
      products,
      filters: {
        brands,
        categories,
      },
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
      case "ups":
        Model = UPS;
        break;
      case "solar-pcu":
        Model = SolarPCU;
        break;
      case "solar-pv":
        Model = SolarPV;
        break;
      case "solar-street-light":
        Model = SolarStreetLight;
        break;
      case "inverter":
        Model = Inverter;
        break;
      case "battery":
        Model = Battery;
        break;
      default:
        return res.status(400).json({ message: "Invalid product type" });
    }

    let product = await Model.findById(id).populate("brand category").lean();

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Calculate review statistics
    const reviewStats = await Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: "$product",
          averageRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    const stats = reviewStats[0] || { averageRating: 0, reviewCount: 0 };
    product.averageRating = stats.averageRating;
    product.reviewCount = stats.reviewCount;

    // Fetch the actual reviews for the product
    const reviews = await Review.find({
      product: new mongoose.Types.ObjectId(id),
    })
      .populate("user", "name email")
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
    const brands = await Brand.find().select({
      _id : 1, name : 1, 
    });;
    const categories = await Category.find().select({
      _id : 1, name : 1, 
    });

    res.json({
      brands,
      categories,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

