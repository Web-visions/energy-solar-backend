const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        unique: true,
        sparse: true // Allow multiple null values
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        productType: {
            type: String,
            required: true,
            enum: ['battery', 'ups', 'inverter', 'solar-pv', 'solar-pcu', 'solar-street-light']
        },
        product: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'items.productType'
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        },
        withOldBattery: {
            type: Boolean
        }
    }],
    totalAmount: {
        type: Number,
        required: true,
    },
    deliveryCharge: {
        type: Number,
        required: true,
        default: 0
    },
    shippingInfo: {
        type: Object,
        required: true,
    },
    paymentInfo: {
        razorpay_order_id: String,
        razorpay_payment_id: String,
        razorpay_signature: String,
        method: {
            type: String,
            enum: ['cod', 'razorpay'],
            default: 'razorpay',
        }
    },
    paymentStatus: {
        type: String,
        required: true,
        enum: ['Pending', 'Paid', 'Failed'],
        default: 'Pending'
    },
    orderStatus: {
        type: String,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'Pending'
    },
    deliveryDate: Date,
    notes: String,
}, {
    timestamps: true
});

// Generate order number
orderSchema.pre('save', async function (next) {
    try {
        if (!this.orderNumber) {
            const date = new Date();
            const year = date.getFullYear().toString().slice(-2);
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const todayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const todayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

            const orderCount = await this.constructor.countDocuments({
                createdAt: { $gte: todayStart, $lt: todayEnd }
            });

            const sequence = (orderCount + 1).toString().padStart(3, '0');
            this.orderNumber = `ORD${year}${month}${day}${sequence}`;
        }
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('Order', orderSchema); 