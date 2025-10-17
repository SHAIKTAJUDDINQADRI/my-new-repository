const Review = require('../models/review.model');
const Product = require('../models/product.model');
const Order = require('../models/order.model');

// Create new review
exports.createReview = async (req, res) => {
  try {
    const { productId, rating, title, comment } = req.body;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user has purchased this product
    const hasOrderedProduct = await Order.findOne({
      user: req.userId,
      'items.product': productId,
      status: 'delivered'
    });

    if (!hasOrderedProduct) {
      return res.status(403).json({ message: 'You can only review products you have purchased' });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({ user: req.userId, product: productId });
    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    // Create review
    const review = new Review({
      user: req.userId,
      product: productId,
      rating,
      title,
      comment
    });

    await review.save();

    // Update product average rating
    const reviews = await Review.find({ product: productId });
    const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    product.averageRating = avgRating;
    product.reviewCount = reviews.length;
    await product.save();

    res.status(201).json({ message: 'Review created successfully', review });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all reviews (Admin only)
exports.getAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    const totalReviews = await Review.countDocuments(query);
    const reviews = await Review.find(query)
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit))
      .populate('user', 'username email')
      .populate('product', 'name');

    res.status(200).json({
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalReviews / limit),
      totalReviews,
      reviews
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get review by ID
exports.getReviewById = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('user', 'username email')
      .populate('product', 'name description images');

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.status(200).json(review);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get reviews by product ID
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, rating, sort = '-createdAt' } = req.query;

    const query = { product: productId, status: 'approved' };
    if (rating) {
      query.rating = Number(rating);
    }

    const skip = (page - 1) * limit;
    const totalReviews = await Review.countDocuments(query);
    const reviews = await Review.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .populate('user', 'username');

    res.status(200).json({
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalReviews / limit),
      totalReviews,
      reviews
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user's reviews
exports.getUserReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const totalReviews = await Review.countDocuments({ user: req.userId });
    const reviews = await Review.find({ user: req.userId })
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit))
      .populate('product', 'name images');

    res.status(200).json({
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalReviews / limit),
      totalReviews,
      reviews
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update review
exports.updateReview = async (req, res) => {
  try {
    const { rating, title, comment } = req.body;

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user owns this review
    if (review.user.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to update this review' });
    }

    // Update fields
    if (rating) review.rating = rating;
    if (title) review.title = title;
    if (comment) review.comment = comment;
    review.updatedAt = Date.now();

    await review.save();

    // Update product average rating
    const reviews = await Review.find({ product: review.product });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await Product.findByIdAndUpdate(review.product, {
      averageRating: avgRating,
      reviewCount: reviews.length
    });

    res.status(200).json({ message: 'Review updated successfully', review });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete review
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user owns this review or is admin
    if (review.user.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    const productId = review.product;
    await Review.findByIdAndDelete(req.params.id);

    // Update product average rating
    const reviews = await Review.find({ product: productId });
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;
    await Product.findByIdAndUpdate(productId, {
      averageRating: avgRating,
      reviewCount: reviews.length
    });

    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Approve review (Admin only)
exports.approveReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.status(200).json({ message: 'Review approved successfully', review });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reject review (Admin only)
exports.rejectReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.status(200).json({ message: 'Review rejected', review });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark review as helpful
exports.markHelpful = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user already marked as helpful
    if (review.helpfulBy.includes(req.userId)) {
      return res.status(400).json({ message: 'You already marked this review as helpful' });
    }

    review.helpfulCount += 1;
    review.helpfulBy.push(req.userId);
    await review.save();

    res.status(200).json({ message: 'Review marked as helpful', review });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get review statistics (Admin only)
exports.getReviewStatistics = async (req, res) => {
  try {
    const totalReviews = await Review.countDocuments();
    const pendingReviews = await Review.countDocuments({ status: 'pending' });
    const approvedReviews = await Review.countDocuments({ status: 'approved' });
    const rejectedReviews = await Review.countDocuments({ status: 'rejected' });

    const averageRating = await Review.aggregate([
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);

    const ratingDistribution = await Review.aggregate([
      { $group: { _id: '$rating', count: { $count: {} } } },
      { $sort: { _id: -1 } }
    ]);

    res.status(200).json({
      totalReviews,
      pendingReviews,
      approvedReviews,
      rejectedReviews,
      averageRating: averageRating[0]?.avgRating || 0,
      ratingDistribution
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
