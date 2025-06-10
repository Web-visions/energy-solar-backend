const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a category name'],
    trim: true,
    maxlength: [50, 'Category name cannot be more than 50 characters'],
    unique: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  powerCapacity: {
    type: Number,
    description: 'Power capacity in mAh (milliampere-hour)'
  },
  voltage: {
    type: Number,
    description: 'Voltage in V (volts)'
  },
  batteryType: {
    type: String,
    enum: ['Lithium-ion', 'Lithium-polymer', 'Lead-acid', 'Nickel-cadmium', 'Nickel-metal hydride', 'Other'],
    default: 'Lithium-ion'
  },
  dimensions: {
    length: { type: Number },
    width: { type: Number },
    height: { type: Number },
    unit: { type: String, default: 'mm' }
  },
  weight: {
    value: { type: Number },
    unit: { type: String, default: 'g' }
  },
  chargingTime: {
    type: String
  },
  dischargingTime: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  image: {
    type: String,
    default: 'no-image.jpg'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Category', CategorySchema);