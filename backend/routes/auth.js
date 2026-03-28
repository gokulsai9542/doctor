const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { auth, adminOnly } = require('../middleware/auth');

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashed, role: 'provider', phone });
    res.status(201).json({ message: 'Registered successfully' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Admin-only: create a doctor account
router.post('/create-doctor', auth, adminOnly, async (req, res) => {
  try {
    const { name, email, password, specialization, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required.' });
    const hashed = await bcrypt.hash(password, 10);
    const doctor = await User.create({ name, email, password: hashed, role: 'doctor', specialization, phone });
    res.status(201).json({ message: 'Doctor account created.', doctor: { id: doctor._id, name: doctor.name, email: doctor.email, specialization: doctor.specialization } });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: { id: user._id, name: user.name, role: user.role, specialization: user.specialization, organization: user.organization },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Forgot password — generates a reset token (mock: returned in response for hackathon)
router.post('/forgot-password', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ message: 'No account found with that email.' });
    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 min
    await user.save();
    // In production send via email; for hackathon return token directly
    res.json({ message: 'Reset link generated.', resetToken: token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({ resetToken: token, resetTokenExpiry: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: 'Invalid or expired reset token.' });
    user.password = await bcrypt.hash(password, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();
    res.json({ message: 'Password reset successful.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all doctors (for provider to pick who annotates)
router.get('/doctors', auth, async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor' }).select('name email specialization payoutRate');
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Doctor sets their own payout rate
router.patch('/payout-rate', auth, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') return res.status(403).json({ message: 'Doctors only' });
    const { payoutRate } = req.body;
    if (!payoutRate || payoutRate < 1) return res.status(400).json({ message: 'Invalid rate' });
    const user = await User.findByIdAndUpdate(req.user.id, { payoutRate }, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(user);
});

// Doctor updates bank details for Razorpay payout
router.patch('/bank-details', auth, async (req, res) => {
  const { bankAccountNumber, ifscCode, phone } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { bankAccountNumber, ifscCode, phone },
    { new: true }
  ).select('-password');
  res.json(user);
});

// Web3Auth login — upsert user by wallet address, return JWT
router.post('/web3-login', async (req, res) => {
  try {
    const { walletAddress, name, email } = req.body;
    if (!walletAddress) return res.status(400).json({ message: 'walletAddress required' });

    // Find existing user by wallet or email
    let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });

    if (!user && email) {
      user = await User.findOne({ email });
    }

    if (!user) {
      // Auto-create provider account for new Web3Auth users
      user = await User.create({
        name:          name || `User_${walletAddress.slice(2, 8)}`,
        email:         email || `${walletAddress.slice(2, 10)}@web3.medannotate`,
        password:      require('crypto').randomBytes(32).toString('hex'), // random, unusable
        role:          'provider',
        walletAddress: walletAddress.toLowerCase(),
      });
    } else {
      // Update wallet address if not set
      if (!user.walletAddress) {
        user.walletAddress = walletAddress.toLowerCase();
        await user.save();
      }
    }

    const token = require('jsonwebtoken').sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, role: user.role, walletAddress: user.walletAddress },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
