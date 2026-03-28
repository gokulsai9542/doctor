const router         = require('express').Router();
const RejectedUpload = require('../models/RejectedUpload');
const { auth, adminOnly } = require('../middleware/auth');

// Admin: get all rejected uploads with stats
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const rejected = await RejectedUpload.find()
      .populate('uploadedBy', 'name email organization')
      .sort({ createdAt: -1 })
      .limit(200);

    const stats = {
      total:          rejected.length,
      non_medical:    rejected.filter(r => r.reason === 'non_medical').length,
      low_confidence: rejected.filter(r => r.reason === 'low_confidence').length,
      invalid_mime:   rejected.filter(r => r.reason === 'invalid_mime').length,
      too_large:      rejected.filter(r => r.reason === 'too_large').length,
      ai_unavailable: rejected.filter(r => r.reason === 'ai_unavailable').length,
    };

    res.json({ stats, rejected });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
