// models/VehicleModel.js
const mongoose = require('mongoose');

const vehicleModelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        enum: ['2-wheeler', '4-wheeler', 'truck'],
        required: true
    },
    manufacturer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Manufacturer',
        required: true
    },

}, { timestamps: true });

vehicleModelSchema.pre('save', async function (next) {
    const Manufacturer = mongoose.model('Manufacturer');
    const manufacturer = await Manufacturer.findById(this.manufacturer);

    if (!manufacturer) {
        return next(new Error('Manufacturer not found'));
    }

    if (manufacturer.category !== this.category) {
        return next(new Error(`Manufacturer belongs to ${manufacturer.category}, but model is in ${this.category}`));
    }

    next();
});

module.exports = mongoose.model('VehicleModel', vehicleModelSchema);
