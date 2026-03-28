const router = require('express').Router();
const Annotation = require('../models/Annotation');
const Image = require('../models/Image');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { auth, adminOnly } = require('../middleware/auth');
const { toCOCO, toYOLO } = require('../utils/exportFormat');
const notify = require('../utils/notify');
const { calcConfidenceScore, calcDifficultyAndPayout } = require('../utils/aiUtils');
const {
  storeAnnotationOnChain,
  approveAnnotationOnChain,
  rejectAnnotationOnChain,
} = require('../services/blockchainService');

// Submit annotation
router.post('/', auth, async (req, res) => {
  try {
    const { imageId, labels, notes, aiSuggestions, aiConfidence } = req.body;
    const doctor = await User.findById(req.user.id);

    // Confidence score: IoU between doctor boxes and AI suggestions
    const confidenceScore = calcConfidenceScore(labels, aiSuggestions);

    // Difficulty + dynamic payout
    const numBoxes = labels.filter(l => l.type === 'bbox').length;
    const { difficulty, payoutAmount } = calcDifficultyAndPayout(
      aiConfidence ?? null, numBoxes, doctor?.payoutRate || 5
    );

    // Flag low-confidence annotations for admin attention
    const flagged = confidenceScore !== null && confidenceScore < 0.3;

    const annotation = await Annotation.create({
      image: imageId, doctor: req.user.id, labels,
      doctorNotes:     notes || '',
      aiSuggestions:   aiSuggestions || [],
      confidenceScore,
      aiConfidence:    aiConfidence ?? null,
      difficulty,
      payoutAmount,
      flagged,
    });
    await Image.findByIdAndUpdate(imageId, { status: 'completed' });

    // ── Blockchain: store annotation hash (non-blocking) ──────────────────────
    const chainData = { imageId, doctorId: req.user.id, labels };
    storeAnnotationOnChain(annotation._id.toString(), doctor.walletAddress, chainData)
      .then(({ txHash, annotationHash, onChain }) => {
        Annotation.findByIdAndUpdate(annotation._id, { blockchainTxHash: txHash, annotationHash, onChain }).exec();
      })
      .catch(err => console.error('[Blockchain] store error:', err.message));
    // ─────────────────────────────────────────────────────────────────────────

    const admins = await User.find({ role: 'admin' });
    await Promise.all(admins.map(admin => notify(admin._id, {
      title:   flagged ? '⚠️ Low-Confidence Annotation' : 'Annotation Submitted',
      message: `Dr. ${doctor.name} submitted a ${difficulty} annotation${flagged ? ' (needs review)' : ''}.`,
      type:    'annotation_submitted',
      link:    '/admin',
    })));

    res.status(201).json(annotation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Doctor: get own annotations
router.get('/mine', auth, async (req, res) => {
  const annotations = await Annotation.find({ doctor: req.user.id }).populate('image');
  res.json(annotations);
});

// Admin: get all submitted annotations
router.get('/', auth, adminOnly, async (req, res) => {
  const annotations = await Annotation.find()
    .populate('image')
    .populate('doctor', 'name email');
  res.json(annotations);
});

// Admin: approve or reject annotation
router.patch('/review/:id', auth, adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const annotation = await Annotation.findByIdAndUpdate(
      req.params.id, { status, adminNote }, { new: true }
    );

    // ── Blockchain: approve or reject on-chain (non-blocking) ─────────────────
    if (status === 'approved') {
      approveAnnotationOnChain(annotation._id.toString())
        .then(({ txHash }) => { if (txHash) console.log('[Blockchain] Approved tx:', txHash); })
        .catch(err => console.error('[Blockchain] approve error:', err.message));
    } else if (status === 'rejected') {
      rejectAnnotationOnChain(annotation._id.toString())
        .catch(err => console.error('[Blockchain] reject error:', err.message));
    }
    // ─────────────────────────────────────────────────────────────────────────

    if (status === 'approved') {
      const image = await Image.findById(annotation.image);
      const existing = await Payment.findOne({ annotation: annotation._id });
      if (!existing) {
        await Payment.create({
          doctor:     annotation.doctor,
          provider:   image.uploadedBy || null,
          annotation: annotation._id,
          amount:     annotation.payoutAmount,
          currency:   'INR',
          status:     'pending',
        });
      }
      // Notify doctor — approved
      await notify(annotation.doctor, {
        title:   'Annotation Approved ✅',
        message: `Your annotation was approved! Payment of ₹${annotation.payoutAmount} is pending.`,
        type:    'annotation_approved',
        link:    '/earnings',
      });
      // Notify provider — payment due
      if (image.uploadedBy) {
        await notify(image.uploadedBy, {
          title:   'Payment Due 💳',
          message: `An annotation was approved. Please pay the doctor ₹${annotation.payoutAmount}.`,
          type:    'payment_created',
          link:    '/provider',
        });
      }
    } else if (status === 'rejected') {
      // Notify doctor — rejected
      await notify(annotation.doctor, {
        title:   'Annotation Rejected ❌',
        message: `Your annotation was rejected. ${adminNote ? 'Note: ' + adminNote : 'Please review and resubmit.'}`,
        type:    'annotation_rejected',
        link:    '/tasks',
      });
    }

    const populated = await Annotation.findById(annotation._id).populate('image').populate('doctor', 'name email');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: dataset quality dashboard stats
router.get('/quality-stats', auth, adminOnly, async (req, res) => {
  try {
    const all   = await Annotation.find().populate('doctor', 'name email');
    const total = all.length;
    if (total === 0) return res.json({ total: 0 });

    const approved  = all.filter(a => a.status === 'approved').length;
    const rejected  = all.filter(a => a.status === 'rejected').length;
    const flagged   = all.filter(a => a.flagged).length;
    const scored    = all.filter(a => a.confidenceScore !== null);
    const avgConf   = scored.length
      ? parseFloat((scored.reduce((s, a) => s + a.confidenceScore, 0) / scored.length).toFixed(3))
      : null;

    // Top doctors by approval rate
    const doctorMap = {};
    all.forEach(a => {
      const id = a.doctor?._id?.toString();
      if (!id) return;
      if (!doctorMap[id]) doctorMap[id] = { name: a.doctor.name, email: a.doctor.email, total: 0, approved: 0, totalConf: 0, confCount: 0 };
      doctorMap[id].total++;
      if (a.status === 'approved') doctorMap[id].approved++;
      if (a.confidenceScore !== null) { doctorMap[id].totalConf += a.confidenceScore; doctorMap[id].confCount++; }
    });
    const topDoctors = Object.values(doctorMap)
      .map(d => ({
        name:         d.name,
        email:        d.email,
        total:        d.total,
        approved:     d.approved,
        approvalRate: d.total ? parseFloat(((d.approved / d.total) * 100).toFixed(1)) : 0,
        avgConf:      d.confCount ? parseFloat((d.totalConf / d.confCount).toFixed(3)) : null,
      }))
      .sort((a, b) => b.approvalRate - a.approvalRate)
      .slice(0, 10);

    // Difficulty breakdown
    const difficulty = { easy: 0, medium: 0, hard: 0 };
    all.forEach(a => { if (difficulty[a.difficulty] !== undefined) difficulty[a.difficulty]++; });

    // Low quality: flagged or rejected
    const lowQuality = all
      .filter(a => a.flagged || a.status === 'rejected')
      .slice(0, 10)
      .map(a => ({ id: a._id, doctor: a.doctor?.name, status: a.status, confidenceScore: a.confidenceScore, flagged: a.flagged }));

    res.json({
      total, approved, rejected, flagged,
      rejectionRate: parseFloat(((rejected / total) * 100).toFixed(1)),
      avgConfidenceScore: avgConf,
      difficulty,
      topDoctors,
      lowQuality,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Export COCO format
router.get('/export/coco', auth, adminOnly, async (req, res) => {
  const annotations = await Annotation.find({ status: 'approved' }).populate('image');
  res.json(toCOCO(annotations));
});

// Export YOLO format
router.get('/export/yolo', auth, adminOnly, async (req, res) => {
  const annotations = await Annotation.find({ status: 'approved' }).populate('image');
  res.json(toYOLO(annotations));
});

module.exports = router;
