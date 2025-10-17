const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth.middleware');

// Public routes
router.post('/register', userController.register);
router.post('/login', userController.login);

// Protected routes (require authentication)
router.get('/profile', authenticate, userController.getProfile);
router.put('/update-password', authenticate, userController.updatePassword);

// User management routes
router.get('/users', authenticate, authorizeAdmin, userController.getAllUsers);
router.get('/users/:id', authenticate, userController.getUserById);
router.put('/users/:id', authenticate, userController.updateUser);
router.delete('/users/:id', authenticate, authorizeAdmin, userController.deleteUser);

module.exports = router;
