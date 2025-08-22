// models/ProductLine.js
const mongoose = require('mongoose');

const productLineSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
}, { timestamps: true });

module.exports = mongoose.model('ProductLine', productLineSchema);
