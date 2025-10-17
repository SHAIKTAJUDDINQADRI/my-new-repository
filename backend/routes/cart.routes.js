const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Get user cart
router.get('/', verifyToken, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    
    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] });
    }

    res.status(200).json({
      success: true,
      cart
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching cart', 
      error: error.message 
    });
  }
});

// Add item to cart
router.post('/items', verifyToken, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }

    // Check stock availability
    if (product.stock < quantity) {
      return res.status(400).json({ 
        success: false, 
        message: 'Insufficient stock' 
      });
    }

    // Get or create cart
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
    }

    // Add item to cart
    cart.addItem(
      productId,
      product.name,
      quantity,
      product.images[0],
      product.price
    );

    await cart.save();
    await cart.populate('items.product');

    res.status(200).json({
      success: true,
      cart
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error adding item to cart', 
      error: error.message 
    });
  }
});

// Update cart item quantity
router.put('/items/:productId', verifyToken, async (req, res) => {
  try {
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Quantity must be at least 1' 
      });
    }

    // Validate product exists
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }

    // Check stock availability
    if (product.stock < quantity) {
      return res.status(400).json({ 
        success: false, 
        message: 'Insufficient stock' 
      });
    }

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cart not found' 
      });
    }

    cart.updateItemQuantity(req.params.productId, quantity);
    await cart.save();
    await cart.populate('items.product');

    res.status(200).json({
      success: true,
      cart
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error updating cart item', 
      error: error.message 
    });
  }
});

// Remove item from cart
router.delete('/items/:productId', verifyToken, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cart not found' 
      });
    }

    cart.removeItem(req.params.productId);
    await cart.save();
    await cart.populate('items.product');

    res.status(200).json({
      success: true,
      cart
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error removing item from cart', 
      error: error.message 
    });
  }
});

// Clear cart
router.delete('/', verifyToken, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cart not found' 
      });
    }

    cart.clearCart();
    await cart.save();

    res.status(200).json({
      success: true,
      cart,
      message: 'Cart cleared successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error clearing cart', 
      error: error.message 
    });
  }
});

module.exports = router;
