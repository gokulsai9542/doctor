const mongoose = require('mongoose');

const mlJobSchema = new mongoose.Schema({
  triggeredBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status:         { type: String, enum: ['queued', 'preparing', 'training', 'completed', 'failed'], default: 'queued' },
  format:         { type: String, enum: ['coco', 'yolo'], default: 'coco' },
  totalImages:    { type: Number, default: 0 },
  totalLabels:    { type: Number, default: 0 },
  epochs:         { type: Number, default: 10 },
  currentEpoch:   { type: Number, default: 0 },
  accuracy:       { type: Number, default: 0 },   // final accuracy %
  loss:           { type: Number, default: 0 },
  epochLogs:      [{ epoch: Number, accuracy: Number, loss: Number }],
  modelPath:      { type: String },
  errorMessage:   { type: String },
  completedAt:    { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('MLJob', mlJobSchema);
