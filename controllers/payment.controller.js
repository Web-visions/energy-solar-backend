const razorpayInstance = require('../config/razorpay.config.js');
const Order = require('../models/order.model.js');
const Cart = require('../models/cart.model.js');
const crypto = require('crypto');
const City = require('../models/city.model.js');
const SolarPCU = require('../models/solor-pcu.model.js');
const SolarPV = require('../models/solor-pv.model.js');
const SolarStreetLight = require('../models/solor-street-light.model.js');
const Inverter = require('../models/inverter.model.js');
const Battery = require('../models/battery.js');
const UPS = require('../models/ups.model.js');

const getRazorpayKey = async (req, res) => {
    res.status(200).json({ key: process.env.RAZORYPAY_KEY_ID });
}

const createOrder = async (req, res) => {
    try {
        const { cityId } = req.body;
        if (!cityId) {
            return res.status(400).json({ message: 'City is required.' });
        }

        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json({ message: 'Cart is empty' });
        }

        const city = await City.findById(cityId);
        if (!city) {
            return res.status(404).json({ message: 'City not found.' });
        }

        const totalAmount = cart.totalAmount + (city.deliveryCharge || 0);

        const options = {
            amount: Math.round(totalAmount * 100),
            currency: "INR",
            receipt: `receipt_order_${new Date().getTime()}`,
        };

        const order = await razorpayInstance.orders.create(options);

        if (!order) {
            return res.status(500).json({ message: 'Something went wrong' });
        }

        res.status(200).json(order);
    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, shippingInfo } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: "Payment details are missing." });
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORYPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            const cart = await Cart.findOne({ user: req.user.id });

            if (!cart) {
                return res.status(404).json({ message: 'Cart not found' });
            }

            const orderItems = [];
            for (const item of cart.items) {
                let product;
                switch (item.productType) {
                    case 'ups': product = await UPS.findById(item.productId); break;
                    case 'solar-pcu': product = await SolarPCU.findById(item.productId); break;
                    case 'solar-pv': product = await SolarPV.findById(item.productId); break;
                    case 'solar-street-light': product = await SolarStreetLight.findById(item.productId); break;
                    case 'inverter': product = await Inverter.findById(item.productId); break;
                    case 'battery': product = await Battery.findById(item.productId); break;
                    default: return res.status(400).json({ message: `Invalid product type: ${item.productType}` });
                }

                if (!product) {
                    return res.status(404).json({ message: `Product not found: ${item.productId}` });
                }

                const price = product.price || product.sellingPrice || product.mrp || 0;

                orderItems.push({
                    product: item.productId,
                    productType: item.productType,
                    quantity: item.quantity,
                    price: price,
                    ...(item.productType === 'battery' && { withOldBattery: item.withOldBattery })
                });
            }

            let city = null;
            let deliveryCharge = 0;
            if (shippingInfo && shippingInfo.cityId) {
                city = await City.findById(shippingInfo.cityId);
                if (city) deliveryCharge = city.deliveryCharge || 0;
            }
            const totalAmount = cart.totalAmount + deliveryCharge;

            const newOrder = new Order({
                user: req.user.id,
                items: orderItems,
                totalAmount: totalAmount,
                deliveryCharge: deliveryCharge,
                shippingInfo: shippingInfo,
                paymentInfo: {
                    razorpay_order_id,
                    razorpay_payment_id,
                    razorpay_signature,
                },
                paymentStatus: 'Paid',
            });

            await newOrder.save();

            await Cart.findByIdAndUpdate(cart._id, {
                $set: { items: [], totalAmount: 0 },
            });

            res.status(201).json({
                success: true,
                message: "Order placed successfully",
                order: newOrder
            });

        } else {
            return res.status(400).json({ message: "Invalid signature." });
        }
    } catch (error) {
        console.error("Error verifying payment:", error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

module.exports = { createOrder, getRazorpayKey, verifyPayment }