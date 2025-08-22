// models/Battery.js
const mongoose = require('mongoose');

const batterySchema = new mongoose.Schema({
  prodType: { type: String, default: "battery" },
  productLine: { type: mongoose.Schema.Types.ObjectId, ref: "ProductLine" },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },

  // VEHICLE/MANUFACTURER FIELDS (Non-mandatory)
  manufacturer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Manufacturer',
    required: false // Optional - not all batteries are vehicle-specific
  },
  vehicleModel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VehicleModel',
    required: false // Optional - not all batteries are model-specific
  },
  compatibleManufacturers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Manufacturer'
  }], // Array for batteries compatible with multiple manufacturers
  compatibleModels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VehicleModel'
  }], // Array for batteries compatible with multiple models

  name: { type: String, required: true },
  description: String,
  features: [String],
  image: String,
  nominalFilledWeight: String,
  batteryType: { type: String, enum: ['li ion', 'lead acid', 'smf'] },
  AH: Number,
  dimension: String,
  warranty: String,
  mrp: Number,
  priceWithoutOldBattery: Number,
  priceWithOldBattery: Number,
  isFeatured: { type: Boolean, default: false },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }]
}, { timestamps: true });

// Indexes for better performance on vehicle-related queries
batterySchema.index({ manufacturer: 1, vehicleModel: 1 });
batterySchema.index({ compatibleManufacturers: 1 });
batterySchema.index({ compatibleModels: 1 });

module.exports = mongoose.model('Battery', batterySchema);
