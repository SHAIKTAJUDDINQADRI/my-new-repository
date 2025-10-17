const Order = require('../models/order.model');
const Product = require('../models/product.model');
const Cart = require('../models/cart.model');

// Create new order
exports.createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, paymentDetails } = req.body;

    // Calculate total amount
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Product with ID ${item.productId} not found` });
      }

      // Check stock availability
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for product ${product.name}` });
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price,
        total: itemTotal
      });

      // Update product stock
      product.stock -= item.quantity;
      await product.save();
    }

    const order = new Order({
      user: req.userId,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod,
      paymentDetails
    });

    await order.save();

    // Clear user's cart if exists
    await Cart.findOneAndDelete({ user: req.userId });

    res.status(201).json({ message: 'Order created successfully', order });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all orders (Admin only)
exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    const totalOrders = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit))
      .populate('user', 'username email')
      .populate('items.product', 'name');

    res.status(200).json({
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalOrders / limit),
      totalOrders,
      orders
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'username email')
      .populate('items.product', 'name description images');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is authorized to view this order
    if (order.user._id.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user's orders
exports.getUserOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments({ user: req.userId });
    const orders = await Order.find({ user: req.userId })
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit))
      .populate('items.product', 'name images');

    res.status(200).json({
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalOrders / limit),
      totalOrders,
      orders
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update order status (Admin only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: Date.now() },
      { new: true }
    ).populate('user', 'username email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(200).json({ message: 'Order status updated successfully', order });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update order (Admin only)
exports.updateOrder = async (req, res) => {
  try {
    const { shippingAddress, status, trackingNumber } = req.body;

    const updateData = {};
    if (shippingAddress) updateData.shippingAddress = shippingAddress;
    if (status) updateData.status = status;
    if (trackingNumber) updateData.trackingNumber = trackingNumber;
    updateData.updatedAt = Date.now();

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(200).json({ message: 'Order updated successfully', order });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is authorized to cancel this order
    if (order.user.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to cancel this order' });
    }

    // Check if order can be cancelled
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return res.status(400).json({ message: 'Order cannot be cancelled' });
    }

    // Restore product stock
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }

    order.status = 'cancelled';
    order.updatedAt = Date.now();
    await order.save();

    res.status(200).json({ message: 'Order cancelled successfully', order });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete order (Admin only)
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(200).json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get order statistics (Admin only)
exports.getOrderStatistics = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const processingOrders = await Order.countDocuments({ status: 'processing' });
    const shippedOrders = await Order.countDocuments({ status: 'shipped' });
    const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
    const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });

    const totalRevenue = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    res.status(200).json({
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue: totalRevenue[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
