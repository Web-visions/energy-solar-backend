const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'productType',
        required: true
    },
    productType: {
        type: String,
        required: true,
        enum: ['Battery', 'ups', 'Inverter', 'SolarPCU', 'SolarPV', 'SolarStreetLight']
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: true,
        trim: true
    },
    images: [{
        type: String
    }],
    isVerified: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Prevent duplicate reviews from the same user for the same product
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review; 