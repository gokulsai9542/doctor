const mongoose = require('mongoose');

const rejectedUploadSchema = new mongoose.Schema({
  uploadedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  originalName: { type: String },
  mimeType:     { type: String },
  sizeBytes:    { type: Number },
  aiLabel:      { type: String },
  aiConfidence: { type: Number },
  allScores:    { type: mongoose.Schema.Types.Mixed },
  reason:       { type: String },   // 'non_medical' | 'low_confidence' | 'invalid_mime' | 'too_large' | 'ai_unavailable'
  ip:           { type: String },
}, { timestamps: true });

module.exports = mongoose.model('RejectedUpload', rejectedUploadSchema);
