const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    productType: {
        type: String,
        enum: ['ups', 'solar-pcu', 'solar-pv', 'solar-street-light', 'inverter', 'battery'],
        required: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'items.productType'
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    withOldBattery: {
        type: Boolean,
        default: false
    }
}, { _id: false });

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [cartItemSchema],
    totalAmount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema); 