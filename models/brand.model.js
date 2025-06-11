const mongoose = require('mongoose');

const BrandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a brand name'],
    trim: true,
    maxlength: [50, 'Brand name cannot be more than 50 characters'],
    unique: true
  },
  logo: {
    type: String,
    required: [true, 'Please upload a brand logo']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
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

module.exports = mongoose.model('Brand', BrandSchema);