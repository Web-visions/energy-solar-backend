const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Common schema for all product types
const ProductSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Please provide a product name'],
    trim: true,
    maxlength: [100, 'Product name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a product description'],
    trim: true,
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Please provide a product price'],
    min: [0, 'Price must be a positive number']
  },
  discountPrice: {
    type: Number,
    default: 0
  },
  stock: {
    type: Number,
    required: [true, 'Please provide stock quantity'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  brand: {
    type: Schema.Types.ObjectId,
    ref: 'Brand',
    required: [true, 'Please provide a brand']
  },
  images: [{
    type: String,
    default: 'no-image.jpg'
  }],
  mainImage: {
    type: String,
    default: 'no-image.jpg'
  },
  productType: {
    type: String,
    required: [true, 'Please specify product type'],
    enum: ['battery', 'solar', 'accessory'],
    default: 'battery'
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category'
  },
  weight: {
    value: { type: Number },
    unit: { type: String, default: 'kg' }
  },
  dimensions: {
    length: { type: Number },
    width: { type: Number },
    height: { type: Number },
    unit: { type: String, default: 'mm' }
  },
  warranty: {
    type: String,
    default: '1 year'
  },
  ratings: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  // Battery specific fields
  batteryDetails: {
    batteryType: {
      type: String,
      enum: ['Lithium-ion', 'Lithium-polymer', 'Lead-acid', 'Nickel-cadmium', 'Nickel-metal hydride', 'Other']
    },
    powerCapacity: {
      type: Number, // in mAh
      description: 'Power capacity in mAh (milliampere-hour)'
    },
    voltage: {
      type: Number, // in V
      description: 'Voltage in V (volts)'
    },
    chargingTime: {
      type: String
    },
    dischargingTime: {
      type: String
    },
    lifecycle: {
      type: Number, // number of charge cycles
      description: 'Number of charge cycles'
    }
  },
  // Solar panel specific fields
  solarDetails: {
    panelType: {
      type: String,
      enum: ['Monocrystalline', 'Polycrystalline', 'Thin-Film', 'PERC', 'Bifacial', 'Other']
    },
    powerOutput: {
      type: Number, // in Watts
      description: 'Power output in W (watts)'
    },
    efficiency: {
      type: Number, // percentage
      description: 'Efficiency percentage'
    },
    cellCount: {
      type: Number
    },
    operatingTemperature: {
      min: { type: Number }, // in Celsius
      max: { type: Number }, // in Celsius
      unit: { type: String, default: '°C' }
    },
    installationType: {
      type: String,
      enum: ['Rooftop', 'Ground-mounted', 'Portable', 'Building-integrated', 'Other']
    }
  },
  // Common fields for both product types
  specifications: [{
    name: { type: String },
    value: { type: String }
  }],
  features: [{
    type: String
  }],
  compatibleWith: [{
    type: Schema.Types.ObjectId,
    ref: 'Product'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add index for search optimization
ProductSchema.index({ name: 'text', description: 'text' });

// Middleware to ensure the correct fields are filled based on product type
ProductSchema.pre('save', function(next) {
  if (this.productType === 'battery' && (!this.batteryDetails || !this.batteryDetails.batteryType)) {
    return next(new Error('Battery products require battery details'));
  }
  
  if (this.productType === 'solar' && (!this.solarDetails || !this.solarDetails.panelType)) {
    return next(new Error('Solar products require solar panel details'));
  }
  
  next();
});

module.exports = mongoose.model('Product', ProductSchema);