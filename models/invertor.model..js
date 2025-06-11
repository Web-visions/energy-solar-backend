// models/Inverter.js
const mongoose = require('mongoose');

const inverterSchema = new mongoose.Schema({
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  name: { type: String, required: true },
  image: String,
  description: String,
  features: [String],
  dimension: String,
  capacity: Number,
  warranty: String,
  mrp: Number,
  priceWithoutOldBattery: Number,
  priceWithOldBattery: Number,
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }]
}, { timestamps: true });

module.exports = mongoose.model('Inverter', inverterSchema);
