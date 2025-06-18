const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Create new order
router.post('/', authMiddleware, orderController.createOrder);

// Get user orders
router.get('/user', authMiddleware, orderController.getUserOrders);

// Get all orders (admin)
router.get('/', authMiddleware, orderController.getAllOrders);

// Get order details by ID (for both admin and user)
router.get('/details/:orderId', authMiddleware, orderController.getOrderDetails);

// Get order by ID
router.get('/:orderId', authMiddleware, orderController.getOrderById);

// Update order status (admin)
router.put('/:orderId/status', authMiddleware, orderController.updateOrderStatus);

module.exports = router; 