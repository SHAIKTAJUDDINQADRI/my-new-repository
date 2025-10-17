const Cart = require('../models/cart.model');
const Product = require('../models/product.model');

// Get user's cart
exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.userId }).populate('items.product', 'name price images stock');

    if (!cart) {
      cart = new Cart({ user: req.userId, items: [] });
      await cart.save();
    }

    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add item to cart
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    // Verify product exists and is in stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock available' });
    }

    let cart = await Cart.findOne({ user: req.userId });

    if (!cart) {
      // Create new cart if doesn't exist
      cart = new Cart({
        user: req.userId,
        items: [{ product: productId, quantity, price: product.price }]
      });
    } else {
      // Check if product already exists in cart
      const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

      if (itemIndex > -1) {
        // Update quantity if product exists
        const newQuantity = cart.items[itemIndex].quantity + quantity;
        
        if (product.stock < newQuantity) {
          return res.status(400).json({ message: 'Insufficient stock available' });
        }
        
        cart.items[itemIndex].quantity = newQuantity;
        cart.items[itemIndex].price = product.price;
      } else {
        // Add new product to cart
        cart.items.push({ product: productId, quantity, price: product.price });
      }
    }

    // Calculate total
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    await cart.save();

    await cart.populate('items.product', 'name price images stock');
    res.status(200).json({ message: 'Item added to cart', cart });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update cart item quantity
exports.updateCartItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock available' });
    }

    const cart = await Cart.findOne({ user: req.userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].price = product.price;

    // Calculate total
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    await cart.save();

    await cart.populate('items.product', 'name price images stock');
    res.status(200).json({ message: 'Cart updated successfully', cart });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = cart.items.filter(item => item.product.toString() !== productId);

    // Calculate total
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    await cart.save();

    await cart.populate('items.product', 'name price images stock');
    res.status(200).json({ message: 'Item removed from cart', cart });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Clear entire cart
exports.clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = [];
    cart.total = 0;
    await cart.save();

    res.status(200).json({ message: 'Cart cleared successfully', cart });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get cart item count
exports.getCartCount = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.userId });
    
    if (!cart) {
      return res.status(200).json({ count: 0 });
    }

    const count = cart.items.reduce((total, item) => total + item.quantity, 0);
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Merge guest cart with user cart (for after login)
exports.mergeCart = async (req, res) => {
  try {
    const { guestCartItems } = req.body;

    if (!guestCartItems || guestCartItems.length === 0) {
      return res.status(400).json({ message: 'No items to merge' });
    }

    let cart = await Cart.findOne({ user: req.userId });

    if (!cart) {
      cart = new Cart({ user: req.userId, items: [] });
    }

    // Merge guest cart items with user cart
    for (const guestItem of guestCartItems) {
      const product = await Product.findById(guestItem.productId);
      if (!product) continue;

      const itemIndex = cart.items.findIndex(item => item.product.toString() === guestItem.productId);

      if (itemIndex > -1) {
        // Update quantity if product exists
        const newQuantity = cart.items[itemIndex].quantity + guestItem.quantity;
        if (product.stock >= newQuantity) {
          cart.items[itemIndex].quantity = newQuantity;
        }
      } else {
        // Add new product to cart
        if (product.stock >= guestItem.quantity) {
          cart.items.push({
            product: guestItem.productId,
            quantity: guestItem.quantity,
            price: product.price
          });
        }
      }
    }

    // Calculate total
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    await cart.save();

    await cart.populate('items.product', 'name price images stock');
    res.status(200).json({ message: 'Cart merged successfully', cart });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
