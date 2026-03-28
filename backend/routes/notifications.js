const router       = require('express').Router();
const Notification = require('../models/Notification');
const { auth }     = require('../middleware/auth');

// Get all notifications for logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(30);
    const unreadCount = await Notification.countDocuments({ user: req.user.id, read: false });
    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark all as read
router.patch('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.id, read: false }, { read: true });
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark single as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { read: true });
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
