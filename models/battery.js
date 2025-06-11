// models/Battery.js
const mongoose = require('mongoose');

const batterySchema = new mongoose.Schema({
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },  
  name: { type: String, required: true },
  description: String,
  features: [String],
  image : String,
  nominalFilledWeight: String,
  batteryType: { type: String, enum: ['li ion', 'lead acid', 'smf'] },
  AH: Number,
  dimension: String,
  warranty: String, 
  mrp: Number,
  priceWithoutOldBattery: Number,
  priceWithOldBattery: Number,
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }]
}, { timestamps: true });

module.exports = mongoose.model('Battery', batterySchema);
