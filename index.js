require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const brandRoutes = require('./routes/brand.routes');
const cityRoutes = require('./routes/city.routes');
const categoryRoutes = require('./routes/category.routes');
const productRoutes = require('./routes/product.routes');
const upsRoutes = require('./routes/ups.routes');
const solarStreetLightRoutes = require('./routes/solar-street-light.routes');
const solarPVRoutes = require('./routes/solar-pv.routes');
const solarPCURoutes = require('./routes/solar-pcu.routes');
const inverterRoutes = require('./routes/inverter.routes');
const batteryRoutes = require('./routes/battery.routes');
// const adminRoutes = require('./routes/admin.routes');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: "*",
  credentials: true,
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(cookieParser());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/batteries',batteryRoutes)
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/ups', upsRoutes);
app.use('/api/solar-street-lights', solarStreetLightRoutes);
app.use('/api/solar-pv-modules', solarPVRoutes);
app.use('/api/solar-pcus', solarPCURoutes);
app.use('/api/inverters', inverterRoutes);
// app.use('/api/admin', adminRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Solar Energy Backend API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});