// models/Manufacturer.js
const mongoose = require('mongoose');

const manufacturerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    category: {
        type: String,
        enum: ['2-wheeler', '4-wheeler', 'truck'],
        required: true
    }
}, { timestamps: true });


module.exports = mongoose.model('Manufacturer', manufacturerSchema);
