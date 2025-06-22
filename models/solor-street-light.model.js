// models/SolarStreetLight.js
const mongoose = require('mongoose');

const solarStreetLightSchema = new mongoose.Schema({
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  name: { type: String, required: true },
  description: String,
  image: String,
  modelName: String,
  power: Number,
  replacementPolicy: String,
  staticTags: [String],
  price: { type: Number, required: true },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }]
}, { timestamps: true });

module.exports = mongoose.model('SolarStreetLight', solarStreetLightSchema);
