const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

// Authentication routes
// router.post('/login', userController.login);
router.get('/get-users', userController.getUsers);
router.get('/get-user/:id', userController.getUser);


module.exports = router;