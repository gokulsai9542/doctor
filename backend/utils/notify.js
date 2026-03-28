const Notification = require('../models/Notification');

const notify = async (userId, { title, message, type, link }) => {
  try {
    await Notification.create({ user: userId, title, message, type, link });
  } catch (err) {
    console.error('[Notify] Failed:', err.message);
  }
};

module.exports = notify;
