const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:              { type: String, required: true },
  email:             { type: String, required: true, unique: true },
  password:          { type: String, required: true },
  role:              { type: String, enum: ['doctor', 'admin', 'provider'], default: 'doctor' },
  specialization:    { type: String },        // for doctors
  organization:      { type: String },        // for image providers (hospital/clinic)
  earnings:          { type: Number, default: 0 },
  // Bank details for Razorpay payouts (doctors)
  bankAccountNumber: { type: String },
  ifscCode:          { type: String },
  phone:             { type: String },
  payoutRate:        { type: Number, default: 5 },
  // Web3
  walletAddress:     { type: String, default: null },  // MetaMask wallet
  reputationScore:   { type: Number, default: 0 },     // 0-100, synced from chain
  resetToken:        { type: String },
  resetTokenExpiry:  { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
