const Order = require('../models/order.model');
const Cart = require('../models/cart.model');
const UPS = require('../models/ups.model');
const SolarPCU = require('../models/solor-pcu.model');
const SolarPV = require('../models/solor-pv.model');
const SolarStreetLight = require('../models/solor-street-light.model');
const Inverter = require('../models/invertor.model.');
const Battery = require('../models/battery');

// Helper function to populate product details
async function populateProductDetails(productType, productId) {
    let product;
    switch (productType) {
        case 'ups':
            product = await UPS.findById(productId)
                .populate('brand', 'name logo')
                .select('name image images sellingPrice mrp price type category brand modelName capacity AH batteryType wattage power dimension warranty manufacturer sku packer importer replacementPolicy outputPowerWattage inputVoltage outputVoltage inputFreq outputFreq nominalFilledWeight');
            break;
        case 'solar-pcu':
            product = await SolarPCU.findById(productId)
                .populate('brand', 'name logo')
                .select('name image images sellingPrice mrp price type category brand modelName capacity AH batteryType wattage power dimension warranty manufacturer sku packer importer replacementPolicy outputPowerWattage inputVoltage outputVoltage inputFreq outputFreq nominalFilledWeight');
            break;
        case 'solar-pv':
            product = await SolarPV.findById(productId)
                .populate('brand', 'name logo')
                .select('name image images price type category brand modelName capacity AH batteryType wattage power dimension warranty manufacturer sku packer importer replacementPolicy outputPowerWattage inputVoltage outputVoltage inputFreq outputFreq nominalFilledWeight');
            break;
        case 'solar-street-light':
            product = await SolarStreetLight.findById(productId)
                .populate('brand', 'name logo')
                .select('name image images price type category brand modelName capacity AH batteryType wattage power dimension warranty manufacturer sku packer importer replacementPolicy outputPowerWattage inputVoltage outputVoltage inputFreq outputFreq nominalFilledWeight');
            break;
        case 'inverter':
            product = await Inverter.findById(productId)
                .populate('brand', 'name logo')
                .select('name image images sellingPrice mrp priceWithoutOldBattery priceWithOldBattery type category brand modelName capacity AH batteryType wattage power dimension warranty manufacturer sku packer importer replacementPolicy outputPowerWattage inputVoltage outputVoltage inputFreq outputFreq nominalFilledWeight');
            break;
        case 'battery':
            product = await Battery.findById(productId)
                .populate('brand', 'name logo')
                .select('name image images sellingPrice mrp priceWithoutOldBattery priceWithOldBattery type category brand modelName capacity AH batteryType wattage power dimension warranty manufacturer sku packer importer replacementPolicy outputPowerWattage inputVoltage outputVoltage inputFreq outputFreq nominalFilledWeight');
            break;
    }
    return product;
}

// Create new order
exports.createOrder = async (req, res) => {
    try {
        const { cartId, shippingDetails, paymentMethod, transactionId } = req.body;
        const userId = req.user.id;

        // Get cart with populated items
        const cart = await Cart.findOne({ user: userId });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cart is empty'
            });
        }

        // Populate product details and calculate totals
        let subtotal = 0;
        const orderItems = [];

        for (const item of cart.items) {
            const product = await populateProductDetails(item.productType, item.productId);

            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: `Product not found for ${item.productType}`
                });
            }

            let price = 0;

            if (item.productType.startsWith('solar-')) {
                // Solar products have only 'price' field
                price = product.price || 0;
            } else {
                // For UPS, Battery, Inverter - use sellingPrice if available, otherwise mrp
                price = product.sellingPrice || product.mrp || 0;
            }

            const totalPrice = price * item.quantity;
            subtotal += totalPrice;

            orderItems.push({
                productType: item.productType,
                productId: item.productId,
                quantity: item.quantity,
                price: price,
                totalPrice: totalPrice
            });
        }

        // Get delivery charge from city
        const deliveryCharge = 0; // This should be fetched from city data
        const tax = 0; // Calculate tax if needed
        const total = subtotal + deliveryCharge + tax;

        // Create order
        const order = new Order({
            user: userId,
            items: orderItems,
            shippingDetails,
            paymentDetails: {
                method: paymentMethod,
                transactionId: transactionId || null,
                status: paymentMethod === 'cod' ? 'pending' : 'completed'
            },
            pricing: {
                subtotal,
                deliveryCharge,
                tax,
                total
            },
            status: paymentMethod === 'cod' ? 'pending' : 'confirmed'
        });

        await order.save();

        // Clear cart after successful order
        await Cart.findOneAndUpdate(
            { user: userId },
            { $set: { items: [] } }
        );

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: {
                orderId: order._id,
                orderNumber: order.orderNumber,
                total: order.pricing.total
            }
        });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order'
        });
    }
};

// Get user orders
exports.getUserOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10 } = req.query;

        const orders = await Order.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('items.productId');

        const total = await Order.countDocuments({ user: userId });

        res.json({
            success: true,
            data: orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders'
        });
    }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.id;

        const order = await Order.findOne({ _id: orderId, user: userId })
            .populate('items.productId');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            data: order
        });

    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order'
        });
    }
};

// Get all orders (admin)
exports.getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, search } = req.query;

        const query = {};
        if (status && status !== 'all') {
            query.status = status;
        }
        if (search) {
            query.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { 'shippingDetails.fullName': { $regex: search, $options: 'i' } },
                { 'shippingDetails.email': { $regex: search, $options: 'i' } }
            ];
        }

        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('user', 'name email')
            .populate('items.productId');

        const total = await Order.countDocuments(query);

        res.json({
            success: true,
            data: orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders'
        });
    }
};

// Update order status (admin)
exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, notes } = req.body;

        const order = await Order.findByIdAndUpdate(
            orderId,
            {
                status,
                notes: notes
            },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            message: 'Order status updated successfully',
            data: order
        });

    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status'
        });
    }
};

// Get order details by ID (for both admin and user)
exports.getOrderDetails = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Build query based on user role
        let query = { _id: orderId };
        if (userRole !== 'admin') {
            query.user = userId;
        }

        const order = await Order.findOne(query)
            .populate('user', 'name email')
            .lean();

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Populate product details for each item
        const populatedItems = await Promise.all(
            order.items.map(async (item) => {
                const product = await populateProductDetails(item.productType, item.productId);
                return {
                    ...item,
                    productId: product
                };
            })
        );

        const populatedOrder = {
            ...order,
            items: populatedItems
        };

        res.json({
            success: true,
            data: populatedOrder
        });

    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order details'
        });
    }
}; 