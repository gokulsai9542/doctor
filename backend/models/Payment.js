const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  doctor:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  provider:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  annotation:    { type: mongoose.Schema.Types.ObjectId, ref: 'Annotation' },
  amount:        { type: Number, required: true },
  currency:      { type: String, default: 'INR' },
  status:        { type: String, enum: ['pending', 'processing', 'paid', 'failed'], default: 'pending' },
  transactionId: { type: String },
  paidAt:        { type: Date },
  note:          { type: String },
  // Web3
  blockchainTxHash: { type: String, default: null },
  onChain:          { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
