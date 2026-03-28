const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:   { type: String, required: true },
  message: { type: String, required: true },
  type:    { type: String, enum: ['image_uploaded', 'annotation_submitted', 'annotation_approved', 'annotation_rejected', 'payment_created', 'payment_paid', 'payment_failed'], required: true },
  read:    { type: Boolean, default: false },
  link:    { type: String },   // frontend route to navigate to
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
