const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('AUTH HEADER:', authHeader);

  const token = authHeader?.split(' ')[1];
  console.log('TOKEN:', token);

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('DECODED PAYLOAD:', decoded);
    const user = await User.findById(decoded.id).select('-password -otp');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error('JWT VERIFY ERROR:', err.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
