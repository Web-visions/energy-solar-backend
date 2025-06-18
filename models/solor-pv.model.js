// models/SolarPVModule.js
const mongoose = require('mongoose');

const solarPVModuleSchema = new mongoose.Schema({
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  name: { type: String, required: true },
  description: String,
  images: [String],
  brand: String,
  modelName: String,
  sku: String,
  type: { type: String, enum: ['polycrystalline', 'monocrystalline'] },
  weight: Number,
  dimension: String,
  manufacturer: String,
  packer: String,
  importer: String,
  replacementPolicy: String,
  staticTags: [String],
  price: { type: Number, required: true },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }]
}, { timestamps: true });

module.exports = mongoose.model('SolarPVModule', solarPVModuleSchema);
