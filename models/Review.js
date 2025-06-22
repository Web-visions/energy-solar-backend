const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

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
        enum: ['battery', 'ups', 'inverter', 'solar-pcu', 'solar-pv', 'solar-street-light']
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

reviewSchema.plugin(mongoosePaginate);

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review; 