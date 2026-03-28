const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  url:           { type: String, required: true },
  publicId:      { type: String },
  modality:      { type: String, enum: ['xray', 'mri', 'ct'], required: true },
  uploadedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  providerNote:  { type: String },
  status:        { type: String, enum: ['pending', 'assigned', 'completed'], default: 'pending' },
  assignedTo:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  autoAssigned:  { type: Boolean, default: false },
  // AI validation fields
  aiLabel:       { type: String },          // label returned by Flask: xray | mri | ct | other
  aiConfidence:  { type: Number },          // 0.0 - 1.0
  aiAllScores:   { type: mongoose.Schema.Types.Mixed },
  imageHash:     { type: String },          // MD5 hash for duplicate detection
}, { timestamps: true });

// Unique index on hash to prevent duplicate uploads
imageSchema.index({ imageHash: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Image', imageSchema);
