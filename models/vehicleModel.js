// models/VehicleModel.js
const mongoose = require('mongoose');

const vehicleModelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    manufacturer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Manufacturer',
        required: true
    },

}, { timestamps: true });


module.exports = mongoose.model('VehicleModel', vehicleModelSchema);
