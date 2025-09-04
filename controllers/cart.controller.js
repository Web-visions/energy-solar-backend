const Cart = require('../models/cart.model');
const UPS = require('../models/ups.model');
const SolarPCU = require('../models/solor-pcu.model');
const SolarPV = require('../models/solor-pv.model');
const SolarStreetLight = require('../models/solor-street-light.model');
const Inverter = require('../models/inverter.model');
const Battery = require('../models/battery');

// Utility function to remove items from all user carts when a product is deleted
exports.removeProductFromAllCarts = async (productType, productId) => {
  try {
    // Find all carts that contain this product
    const cartsToUpdate = await Cart.find({
      'items.productType': productType,
      'items.productId': productId
    });

    // Update each cart by removing the specific item
    for (const cart of cartsToUpdate) {
      cart.items = cart.items.filter(
        item => !(item.productType === productType && item.productId.toString() === productId.toString())
      );
      
      // Recalculate total amount
      cart.totalAmount = await calculateTotalAmount(cart.items);
      await cart.save();
    }

    console.log(`Removed ${productType} with ID ${productId} from ${cartsToUpdate.length} carts`);
  } catch (error) {
    console.error('Error removing product from carts:', error);
  }
};

// Helper function to populate cart with detailed product information
async function populateCartDetails(cart) {
    // Manually populate product details for each item
    const populatedItems = await Promise.all(
        cart.items.map(async (item) => {
            let product;
            switch (item.productType) {
                case 'ups':
                    product = await UPS.findById(item.productId)
                        .populate('brand', 'name logo')
                        .select('name image images sellingPrice mrp price type category brand modelName capacity AH batteryType wattage power dimension warranty manufacturer sku packer importer replacementPolicy outputPowerWattage inputVoltage outputVoltage inputFreq outputFreq nominalFilledWeight');
                    break;
                case 'solar-pcu':
                    product = await SolarPCU.findById(item.productId)
                        .populate('brand', 'name logo')
                        .select('name image images sellingPrice mrp price type category brand modelName capacity AH batteryType wattage power dimension warranty manufacturer sku packer importer replacementPolicy outputPowerWattage inputVoltage outputVoltage inputFreq outputFreq nominalFilledWeight');
                    break;
                case 'solar-pv':
                    product = await SolarPV.findById(item.productId)
                        .populate('brand', 'name logo')
                        .select('name image images price type category brand modelName capacity AH batteryType wattage power dimension warranty manufacturer sku packer importer replacementPolicy outputPowerWattage inputVoltage outputVoltage inputFreq outputFreq nominalFilledWeight');
                    break;
                case 'solar-street-light':
                    product = await SolarStreetLight.findById(item.productId)
                        .populate('brand', 'name logo')
                        .select('name image images price type category brand modelName capacity AH batteryType wattage power dimension warranty manufacturer sku packer importer replacementPolicy outputPowerWattage inputVoltage outputVoltage inputFreq outputFreq nominalFilledWeight');
                    break;
                case 'inverter':
                    product = await Inverter.findById(item.productId)
                        .populate('brand', 'name logo')
                        .select('name image images sellingPrice mrp priceWithoutOldBattery priceWithOldBattery type category brand modelName capacity AH batteryType wattage power dimension warranty manufacturer sku packer importer replacementPolicy outputPowerWattage inputVoltage outputVoltage inputFreq outputFreq nominalFilledWeight');
                    break;
                case 'battery':
                    product = await Battery.findById(item.productId)
                        .populate('brand', 'name logo')
                        .select('name image images sellingPrice mrp priceWithoutOldBattery priceWithOldBattery type category brand modelName capacity AH batteryType wattage power dimension warranty manufacturer sku packer importer replacementPolicy outputPowerWattage inputVoltage outputVoltage inputFreq outputFreq nominalFilledWeight');
                    break;
            }

            return {
                ...item.toObject(),
                productId: product
            };
        })
    );

    return {
        ...cart.toObject(),
        items: populatedItems
    };
}

// Get cart for user
exports.getCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id });

        if (!cart) {
            return res.json({ items: [], totalAmount: 0 });
        }

        // Populate detailed product information before sending response
        const populatedCart = await populateCartDetails(cart);

        res.json(populatedCart);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Add item to cart
// Add item to cart
exports.addToCart = async (req, res) => {
  try {
    const { productType, productId } = req.body;
    const requestedQuantity = Number(req.body.quantity ?? 1);
    const applyOldBattery = Boolean(req.body.withOldBattery);

    if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be a positive number' });
    }

    // Validate product exists
    let product;
    switch (productType) {
      case 'ups': product = await UPS.findById(productId); break;
      case 'solar-pcu': product = await SolarPCU.findById(productId); break;
      case 'solar-pv': product = await SolarPV.findById(productId); break;
      case 'solar-street-light': product = await SolarStreetLight.findById(productId); break;
      case 'inverter': product = await Inverter.findById(productId); break;
      case 'battery': product = await Battery.findById(productId); break;
      default: return res.status(400).json({ message: 'Invalid product type' });
    }
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Get or create cart
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) cart = new Cart({ user: req.user._id, items: [], totalAmount: 0 });

    // Check if item already exists
    const existingItem = cart.items.find(
      (cartItem) =>
        cartItem.productType === productType &&
        String(cartItem.productId) === String(productId)
    );

    if (existingItem) {
      const currentQty = Number(existingItem.quantity ?? 0);
      existingItem.quantity = currentQty + requestedQuantity;
      // Only update flag if explicitly provided
      if (req.body.withOldBattery !== undefined) {
        existingItem.withOldBattery = applyOldBattery;
      }
    } else {
      cart.items.push({
        productType,
        productId,
        quantity: requestedQuantity,
        withOldBattery: applyOldBattery,
      });
    }

    cart.totalAmount = await calculateTotalAmount(cart.items); // uses the fixed helper below
    if (!Number.isFinite(cart.totalAmount)) {
      return res.status(400).json({ message: 'Computed total is invalid' });
    }

    await cart.save();

    const populatedCart = await populateCartDetails(cart);
    return res.json(populatedCart);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const { productType, productId } = req.params;
    const newQuantity = Number(req.body.quantity);

    if (!Number.isFinite(newQuantity) || newQuantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be a positive number' });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const item = cart.items.find(
      (cartItem) =>
        cartItem.productType === productType &&
        String(cartItem.productId) === String(productId)
    );
    if (!item) return res.status(404).json({ message: 'Item not found in cart' });

    item.quantity = newQuantity;

    cart.totalAmount = await calculateTotalAmount(cart.items);
    if (!Number.isFinite(cart.totalAmount)) {
      return res.status(400).json({ message: 'Computed total is invalid' });
    }

    await cart.save();
    const populatedCart = await populateCartDetails(cart);
    return res.json(populatedCart);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};



// Remove item from cart
exports.removeFromCart = async (req, res) => {
    try {
        const { productType, productId } = req.params;

        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        cart.items = cart.items.filter(
            item => !(item.productType === productType && item.productId.toString() === productId)
        );

        cart.totalAmount = await calculateTotalAmount(cart.items);
        await cart.save();

        // Populate detailed product information before sending response
        const populatedCart = await populateCartDetails(cart);

        res.json(populatedCart);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Helper function to calculate total amount
async function calculateTotalAmount(items) {
  let cartTotal = 0;

  for (const cartItem of items) {
    const { productType, productId, withOldBattery } = cartItem;
    const itemQuantity = Number(cartItem.quantity);

    if (!Number.isFinite(itemQuantity) || itemQuantity <= 0) {
      throw new Error(`Invalid quantity for product ${productId}`);
    }

    let productDoc;
    switch (productType) {
      case 'ups': productDoc = await UPS.findById(productId); break;
      case 'solar-pcu': productDoc = await SolarPCU.findById(productId); break;
      case 'solar-pv': productDoc = await SolarPV.findById(productId); break;
      case 'solar-street-light': productDoc = await SolarStreetLight.findById(productId); break;
      case 'inverter': productDoc = await Inverter.findById(productId); break;
      case 'battery': productDoc = await Battery.findById(productId); break;
      default: throw new Error(`Unknown product type "${productType}"`);
    }
    if (!productDoc) throw new Error(`Product not found: ${productType}:${productId}`);

    let unitPrice;

    if (productType === 'battery') {
      // Batteries support trade-in by design
      const priceWith = Number(productDoc.priceWithOldBattery);
      const priceWithout = Number(productDoc.priceWithoutOldBattery);
      unitPrice = withOldBattery ? priceWith : priceWithout;
    } else if (productType === 'inverter') {
      // Most inverter schemas DO NOT have old-battery pricing; use selling/mrp/price
      const sellingPrice = Number(productDoc.sellingPrice);
      const mrp = Number(productDoc.mrp);
      const basePrice = Number(productDoc.price);
      unitPrice = [sellingPrice, mrp, basePrice].find(Number.isFinite);
    } else if (productType.startsWith('solar-')) {
      unitPrice = Number(productDoc.price);
    } else {
      // ups or other
      const sellingPrice = Number(productDoc.sellingPrice);
      const mrp = Number(productDoc.mrp);
      const basePrice = Number(productDoc.price);
      unitPrice = [sellingPrice, mrp, basePrice].find(Number.isFinite);
    }

    if (!Number.isFinite(unitPrice)) {
      throw new Error(
        `Price missing/invalid for ${productType}:${productId} (withOldBattery=${withOldBattery})`
      );
    }

    cartTotal += unitPrice * itemQuantity;
  }

  if (!Number.isFinite(cartTotal)) {
    throw new Error('Total computed is not finite');
  }
  return cartTotal;
}
