const router   = require('express').Router();
const Annotation = require('../models/Annotation');
const MLJob    = require('../models/MLJob');
const { auth, adminOnly } = require('../middleware/auth');
const { toCOCO, toYOLO } = require('../utils/exportFormat');
const { simulateCNNTraining } = require('../utils/mlSimulator');

// GET pipeline stats — how many approved annotations are ready
router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const approved = await Annotation.find({ status: 'approved' }).populate('image');
    const totalLabels = approved.reduce((sum, a) => sum + a.labels.length, 0);
    const lastJob = await MLJob.findOne().sort({ createdAt: -1 });
    res.json({
      readyImages:  approved.length,
      totalLabels,
      lastJob,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST trigger training — export annotations + start CNN simulation
router.post('/train', auth, adminOnly, async (req, res) => {
  try {
    const { format = 'coco', epochs = 10 } = req.body;

    const approved = await Annotation.find({ status: 'approved' }).populate('image');
    if (approved.length === 0)
      return res.status(400).json({ message: 'No approved annotations available for training' });

    const totalLabels = approved.reduce((sum, a) => sum + a.labels.length, 0);

    // Export dataset in chosen format
    const dataset = format === 'coco' ? toCOCO(approved) : toYOLO(approved);

    // Create ML job record
    const job = await MLJob.create({
      triggeredBy: req.user.id,
      status:      'preparing',
      format,
      totalImages: approved.length,
      totalLabels,
      epochs:      Number(epochs),
    });

    // Run training simulation in background (non-blocking)
    simulateCNNTraining(job, MLJob).catch(async (err) => {
      await MLJob.findByIdAndUpdate(job._id, { status: 'failed', errorMessage: err.message });
    });

    res.status(201).json({
      message:  'Training job started',
      jobId:    job._id,
      dataset:  { totalImages: approved.length, totalLabels, format },
      preview:  format === 'coco' ? { categories: dataset.categories, imageCount: dataset.images.length }
                                  : { imageCount: dataset.length },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all training jobs
router.get('/jobs', auth, adminOnly, async (req, res) => {
  const jobs = await MLJob.find()
    .populate('triggeredBy', 'name')
    .sort({ createdAt: -1 });
  res.json(jobs);
});

// GET single job status (for polling)
router.get('/jobs/:id', auth, adminOnly, async (req, res) => {
  const job = await MLJob.findById(req.params.id).populate('triggeredBy', 'name');
  if (!job) return res.status(404).json({ message: 'Job not found' });
  res.json(job);
});

// GET export dataset only (without training)
router.get('/export/:format', auth, adminOnly, async (req, res) => {
  const { format } = req.params;
  const approved = await Annotation.find({ status: 'approved' }).populate('image');
  if (approved.length === 0)
    return res.status(400).json({ message: 'No approved annotations to export' });
  const data = format === 'yolo' ? toYOLO(approved) : toCOCO(approved);
  res.json(data);
});

module.exports = router;
