// models/UPS.js
const mongoose = require('mongoose');

const upsSchema = new mongoose.Schema({
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },  
  name: { type: String, required: true },
  image: String,
  description: String,
  features: [String],
  type: String, // e.g., intractive, outractive
  outputPowerWattage: Number,
  inputVoltage: Number,
  outputVoltage: Number,
  inputFreq: Number,
  outputFreq: Number,
  dimension: String,
  warranty: String,
  mrp: Number,
  sellingPrice: Number,
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }]
}, { timestamps: true });

module.exports = mongoose.model('UPS', upsSchema);
