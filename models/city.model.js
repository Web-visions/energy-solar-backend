const mongoose = require('mongoose');

const CitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a city name'],
    trim: true,
    maxlength: [50, 'City name cannot be more than 50 characters'],
    unique: true
  },
  state: {
    type: String,
    required: [true, 'Please provide a state name'],
    trim: true,
    maxlength: [50, 'State name cannot be more than 50 characters']
  },
  deliveryCharge: {
    type: Number,
    default: 0,
    min: [0, 'Delivery charge cannot be negative']
  },
  estimatedDeliveryDays: {
    type: String,
    default: '3-5 days'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('City', CitySchema);