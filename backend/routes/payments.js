const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const User = require('../models/User');
const { auth, adminOnly } = require('../middleware/auth');
const { processPayment, generateTransactionId } = require('../utils/mockPayment');
const notify = require('../utils/notify');

// Doctor: get own earnings & payment history
router.get('/mine', auth, async (req, res) => {
  const payments = await Payment.find({ doctor: req.user.id })
    .populate('annotation')
    .populate('provider', 'name organization')
    .sort({ createdAt: -1 });
  const user = await User.findById(req.user.id).select('earnings');
  res.json({ payments, totalEarnings: user.earnings });
});

// Provider: get payments linked to them
router.get('/provider', auth, async (req, res) => {
  try {
    const payments = await Payment.find({ provider: req.user.id })
      .populate('doctor', 'name email specialization')
      .populate('annotation')
      .sort({ createdAt: -1 });
    const totalSpent = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
    res.json({ payments, totalSpent });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: get all payments
router.get('/', auth, adminOnly, async (req, res) => {
  const payments = await Payment.find()
    .populate('doctor', 'name email')
    .populate('provider', 'name organization')
    .populate('annotation')
    .sort({ createdAt: -1 });
  res.json(payments);
});

// STEP 1 — Create a payment order (like Razorpay order creation)
router.post('/create-order/:paymentId', auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId)
      .populate('doctor', 'name specialization')
      .populate('provider', 'name organization');

    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.status === 'paid') return res.status(400).json({ message: 'Already paid' });

    // Generate a fake order ID
    const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    res.json({
      orderId,
      amount:       payment.amount,
      currency:     payment.currency,
      doctor:       payment.doctor,
      provider:     payment.provider,
      paymentId:    payment._id,
      description:  `Annotation payment to Dr. ${payment.doctor?.name}`,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// STEP 2 — Verify & process payment (like Razorpay payment.captured webhook)
router.post('/verify/:paymentId', auth, async (req, res) => {
  try {
    const { orderId, method } = req.body; // method: upi | card | netbanking
    const payment = await Payment.findById(req.params.paymentId).populate('doctor');

    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.status === 'paid') return res.status(400).json({ message: 'Already paid' });

    // Set to processing
    await Payment.findByIdAndUpdate(payment._id, { status: 'processing' });

    // Run mock processor (1.5s delay, 90% success)
    const result = await processPayment({
      amount:     payment.amount,
      doctorName: payment.doctor.name,
    });

    if (result.success) {
      await Payment.findByIdAndUpdate(payment._id, {
        status:        'paid',
        transactionId: result.transactionId,
        paidAt:        result.processedAt,
        note:          `Paid via ${method || 'UPI'} | Order: ${orderId}`,
      });
      await User.findByIdAndUpdate(payment.doctor._id, { $inc: { earnings: payment.amount } });
      // Notify doctor — payment received
      await notify(payment.doctor._id, {
        title:   'Payment Received 🎉',
        message: `₹${payment.amount} has been credited to your account. TXN: ${result.transactionId}`,
        type:    'payment_paid',
        link:    '/earnings',
      });
      res.json({
        success:       true,
        transactionId: result.transactionId,
        message:       result.message,
        paidAt:        result.processedAt,
      });
    } else {
      await Payment.findByIdAndUpdate(payment._id, { status: 'failed', note: result.message });
      // Notify provider — payment failed
      await notify(req.user.id, {
        title:   'Payment Failed ❌',
        message: `Payment of ₹${payment.amount} to Dr. ${payment.doctor.name} failed. Please retry.`,
        type:    'payment_failed',
        link:    '/provider',
      });
      res.status(402).json({ success: false, message: result.message });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Retry a failed payment
router.post('/retry/:paymentId', auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId).populate('doctor');
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.status === 'paid') return res.status(400).json({ message: 'Already paid' });

    await Payment.findByIdAndUpdate(payment._id, { status: 'processing' });
    const result = await processPayment({ amount: payment.amount, doctorName: payment.doctor.name });

    if (result.success) {
      await Payment.findByIdAndUpdate(payment._id, {
        status: 'paid', transactionId: result.transactionId, paidAt: result.processedAt, note: result.message,
      });
      await User.findByIdAndUpdate(payment.doctor._id, { $inc: { earnings: payment.amount } });
      res.json({ success: true, transactionId: result.transactionId, message: result.message });
    } else {
      await Payment.findByIdAndUpdate(payment._id, { status: 'failed', note: result.message });
      res.status(402).json({ success: false, message: result.message });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
