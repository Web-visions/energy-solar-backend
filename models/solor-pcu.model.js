// models/SolarPCU.js
const mongoose = require('mongoose');

const solarPCUSchema = new mongoose.Schema({
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  name: { type: String, required: true },
  description: String,
  features: [String],
  image: String,
  type: { type: String, enum: ['hybrid pcu', 'off-grid pcu', 'on grid pcu'] },
  wattage: Number,
  modelName: String,
  staticTags: [String],
  warranty: String,
  dimension: String,
  weight: Number,
  price: { type: Number, required: true },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }]
}, { timestamps: true });

module.exports = mongoose.model('SolarPCU', solarPCUSchema);
