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
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
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
        totalPrice: {
            type: Number,
            required: true
        }
    }],
    shippingDetails: {
        fullName: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        address: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        landmark: String
    },
    paymentDetails: {
        method: {
            type: String,
            required: true,
            enum: ['razorpay', 'cod']
        },
        transactionId: String,
        status: {
            type: String,
            required: true,
            enum: ['pending', 'completed', 'failed'],
            default: 'pending'
        }
    },
    pricing: {
        subtotal: {
            type: Number,
            required: true
        },
        deliveryCharge: {
            type: Number,
            default: 0
        },
        tax: {
            type: Number,
            default: 0
        },
        total: {
            type: Number,
            required: true
        }
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    deliveryDate: Date,
    notes: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Generate order number
orderSchema.pre('save', async function (next) {
    try {
        // Generate order number if it doesn't exist
        if (!this.orderNumber) {
            const date = new Date();
            const year = date.getFullYear().toString().slice(-2);
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');

            // Get count of orders today
            const todayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const todayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

            const orderCount = await this.constructor.countDocuments({
                createdAt: {
                    $gte: todayStart,
                    $lt: todayEnd
                }
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