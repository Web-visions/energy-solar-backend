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
exports.addToCart = async (req, res) => {
    try {
        const { productType, productId, quantity, withOldBattery } = req.body;

        // Validate product exists
        let product;
        switch (productType) {
            case 'ups':
                product = await UPS.findById(productId);
                break;
            case 'solar-pcu':
                product = await SolarPCU.findById(productId);
                break;
            case 'solar-pv':
                product = await SolarPV.findById(productId);
                break;
            case 'solar-street-light':
                product = await SolarStreetLight.findById(productId);
                break;
            case 'inverter':
                product = await Inverter.findById(productId);
                break;
            case 'battery':
                product = await Battery.findById(productId);
                break;
            default:
                return res.status(400).json({ message: 'Invalid product type' });
        }

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Get or create cart
        let cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            cart = new Cart({ user: req.user._id, items: [] });
        }

        // Check if item already exists
        const existingItem = cart.items.find(
            item => item.productType === productType && item.productId.toString() === productId
        );

        if (existingItem) {
            existingItem.quantity += quantity;
            existingItem.withOldBattery = withOldBattery || existingItem.withOldBattery;
        } else {
            cart.items.push({ productType, productId, quantity, withOldBattery });
        }

        // Calculate total amount
        cart.totalAmount = await calculateTotalAmount(cart.items);

        await cart.save();

        // Populate detailed product information before sending response
        const populatedCart = await populateCartDetails(cart);

        res.json(populatedCart);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update cart item quantity
exports.updateCartItem = async (req, res) => {
    try {
        const { productType, productId } = req.params;
        const { quantity } = req.body;

        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const item = cart.items.find(
            item => item.productType === productType && item.productId.toString() === productId
        );

        if (!item) {
            return res.status(404).json({ message: 'Item not found in cart' });
        }

        item.quantity = quantity;
        cart.totalAmount = await calculateTotalAmount(cart.items);
        await cart.save();

        // Populate detailed product information before sending response
        const populatedCart = await populateCartDetails(cart);

        res.json(populatedCart);
    } catch (error) {
        res.status(500).json({ message: error.message });
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
    let total = 0;
    for (const item of items) {
        let product;
        switch (item.productType) {
            case 'ups':
                product = await UPS.findById(item.productId);
                break;
            case 'solar-pcu':
                product = await SolarPCU.findById(item.productId);
                break;
            case 'solar-pv':
                product = await SolarPV.findById(item.productId);
                break;
            case 'solar-street-light':
                product = await SolarStreetLight.findById(item.productId);
                break;
            case 'inverter':
                product = await Inverter.findById(item.productId);
                break;
            case 'battery':
                product = await Battery.findById(item.productId);
                break;
        }
        if (product) {
            let price = 0;

            if (item.productType === 'battery' || item.productType === 'inverter') {
                price = item.withOldBattery ? product.priceWithOldBattery : product.priceWithoutOldBattery;
            } else if (item.productType.startsWith('solar-')) {
                price = product.price || 0;
            } else {
                price = product.sellingPrice || product.mrp || 0;
            }

            total += price * item.quantity;
        }
    }
    return total;
} 