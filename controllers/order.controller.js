const Order = require('../models/order.model');
const Cart = require('../models/cart.model');
const UPS = require('../models/ups.model.js');
const SolarPCU = require('../models/solor-pcu.model.js');
const SolarPV = require('../models/solor-pv.model.js');
const SolarStreetLight = require('../models/solor-street-light.model.js');
const Inverter = require('../models/inverter.model.js')
const Battery = require('../models/battery.js');

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

// Helper to manually populate product details in orders
const manuallyPopulateProductDetails = async (orders) => {
    const isSingle = !Array.isArray(orders);
    const ordersArray = isSingle ? [orders] : orders;

    const populatedOrders = await Promise.all(ordersArray.map(async (order) => {
        const orderObj = order.toObject();
        orderObj.items = await Promise.all(orderObj.items.map(async (item) => {
            if (!item.product) return item;
            let productDoc;
            const id = item.product;
            switch (item.productType) {
                case 'ups': productDoc = await UPS.findById(id).lean(); break;
                case 'solar-pcu': productDoc = await SolarPCU.findById(id).lean(); break;
                case 'solar-pv': productDoc = await SolarPV.findById(id).lean(); break;
                case 'solar-street-light': productDoc = await SolarStreetLight.findById(id).lean(); break;
                case 'inverter': productDoc = await Inverter.findById(id).lean(); break;
                case 'battery': productDoc = await Battery.findById(id).lean(); break;
                default: productDoc = null;
            }
            item.product = productDoc;
            return item;
        }));
        return orderObj;
    }));

    return isSingle ? populatedOrders[0] : populatedOrders;
};

// Create new order
exports.createOrder = async (req, res) => {
    try {
        const { shippingInfo, paymentMethod } = req.body;
        const userId = req.user.id;

        if (paymentMethod !== 'cod') {
            return res.status(400).json({
                success: false,
                message: 'This endpoint is for COD orders only.'
            });
        }

        const cart = await Cart.findOne({ user: userId });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty' });
        }

        const orderItems = [];
        for (const item of cart.items) {
            const product = await populateProductDetails(item.productType, item.productId);
            if (!product) {
                return res.status(400).json({ success: false, message: `Product not found for ${item.productType}` });
            }

            let price = product.price || product.sellingPrice || product.mrp || 0;

            orderItems.push({
                product: item.productId,
                productType: item.productType,
                quantity: item.quantity,
                price: price
            });
        }

        const newOrder = new Order({
            user: userId,
            items: orderItems,
            totalAmount: cart.totalAmount,
            shippingInfo: shippingInfo,
            paymentInfo: {
                method: 'cod'
            },
            paymentStatus: 'Pending',
        });

        await newOrder.save();

        await Cart.findByIdAndUpdate(cart._id, {
            $set: { items: [], totalAmount: 0 },
        });

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: {
                orderId: newOrder._id,
                orderNumber: newOrder.orderNumber,
                total: newOrder.totalAmount
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
            .skip((page - 1) * limit);

        const populatedOrders = await manuallyPopulateProductDetails(orders);

        const total = await Order.countDocuments({ user: userId });

        res.json({
            success: true,
            data: populatedOrders,
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

        const order = await Order.findOne({ _id: orderId, user: userId });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const populatedOrder = await manuallyPopulateProductDetails(order);

        res.json({
            success: true,
            data: populatedOrder
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
            query.orderStatus = status;
        }
        if (search) {
            query.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { 'shippingInfo.fullName': { $regex: search, $options: 'i' } },
                { 'shippingInfo.email': { $regex: search, $options: 'i' } }
            ];
        }

        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('user', 'name email');

        const populatedOrders = await manuallyPopulateProductDetails(orders);

        const total = await Order.countDocuments(query);

        res.json({
            success: true,
            data: populatedOrders,
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
                orderStatus: status,
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