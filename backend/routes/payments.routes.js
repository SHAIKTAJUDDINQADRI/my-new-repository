const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
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

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret'
});

// Create Razorpay order
router.post('/razorpay/create-order', verifyToken, async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;

    if (!amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Amount is required' 
      });
    }

    const options = {
      amount: Math.round(amount * 100), // Convert to paise (smallest currency unit)
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      order: {
        id: order.id,
        currency: order.currency,
        amount: order.amount,
        receipt: order.receipt
      },
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_key'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error creating Razorpay order', 
      error: error.message 
    });
  }
});

// Verify Razorpay payment
router.post('/razorpay/verify-payment', verifyToken, async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing payment verification parameters' 
      });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret')
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Fetch payment details
      try {
        const payment = await razorpay.payments.fetch(razorpay_payment_id);
        
        res.status(200).json({
          success: true,
          message: 'Payment verified successfully',
          payment: {
            id: payment.id,
            amount: payment.amount / 100, // Convert from paise to rupees
            currency: payment.currency,
            status: payment.status,
            method: payment.method,
            email: payment.email,
            contact: payment.contact
          },
          verified: true
        });
      } catch (fetchError) {
        // If fetch fails, still return success as signature is valid
        res.status(200).json({
          success: true,
          message: 'Payment verified successfully',
          verified: true
        });
      }
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid payment signature',
        verified: false
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error verifying payment', 
      error: error.message 
    });
  }
});

// Get payment details
router.get('/razorpay/payment/:paymentId', verifyToken, async (req, res) => {
  try {
    const payment = await razorpay.payments.fetch(req.params.paymentId);

    res.status(200).json({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount / 100,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        email: payment.email,
        contact: payment.contact,
        createdAt: payment.created_at
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching payment details', 
      error: error.message 
    });
  }
});

// Refund payment
router.post('/razorpay/refund', verifyToken, async (req, res) => {
  try {
    const { paymentId, amount } = req.body;

    if (!paymentId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment ID is required' 
      });
    }

    const options = {};
    if (amount) {
      options.amount = Math.round(amount * 100); // Convert to paise
    }

    const refund = await razorpay.payments.refund(paymentId, options);

    res.status(200).json({
      success: true,
      message: 'Refund initiated successfully',
      refund: {
        id: refund.id,
        payment_id: refund.payment_id,
        amount: refund.amount / 100,
        currency: refund.currency,
        status: refund.status
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error processing refund', 
      error: error.message 
    });
  }
});

// Webhook endpoint for Razorpay events
router.post('/razorpay/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || 'webhook_secret')
      .update(body)
      .digest('hex');

    if (signature === expectedSignature) {
      const event = req.body.event;
      const payload = req.body.payload;

      // Handle different webhook events
      switch (event) {
        case 'payment.authorized':
          console.log('Payment authorized:', payload.payment.entity.id);
          break;
        case 'payment.captured':
          console.log('Payment captured:', payload.payment.entity.id);
          break;
        case 'payment.failed':
          console.log('Payment failed:', payload.payment.entity.id);
          break;
        case 'refund.created':
          console.log('Refund created:', payload.refund.entity.id);
          break;
        default:
          console.log('Unhandled event:', event);
      }

      res.status(200).json({ success: true, message: 'Webhook processed' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error processing webhook', 
      error: error.message 
    });
  }
});

module.exports = router;
