const router     = require('express').Router();
const multer     = require('multer');
const Image      = require('../models/Image');
const { auth, adminOnly, providerOrAdmin, doctorOnly } = require('../middleware/auth');
const { uploadImage } = require('../controllers/uploadController');

// Memory storage — buffer passed to AI validator before Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },   // 5MB hard limit at multer level
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid file type'), false);
  },
});

// Provider OR Admin uploads image — goes through AI validation
router.post('/upload', auth, providerOrAdmin, upload.single('image'), uploadImage);

// IMPORTANT: static routes must come BEFORE /:id

// Admin: get all images
router.get('/', auth, adminOnly, async (req, res) => {
  const images = await Image.find()
    .populate('assignedTo', 'name email specialization')
    .populate('uploadedBy', 'name organization');
  res.json(images);
});

// Doctors get available tasks — pending (unassigned) OR assigned to them
router.get('/tasks', auth, doctorOnly, async (req, res) => {
  try {
    const images = await Image.find({
      $or: [
        { status: 'pending' },
        { status: 'assigned', assignedTo: req.user.id },
      ]
    }).populate('uploadedBy', 'name organization');
    res.json(images);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Provider: get own uploaded images
router.get('/mine', auth, providerOrAdmin, async (req, res) => {
  try {
    const images = await Image.find({ uploadedBy: req.user.id })
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });
    res.json(images);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Provider manually assigns a doctor to their image
router.patch('/assign-doctor/:id', auth, providerOrAdmin, async (req, res) => {
  try {
    const { doctorId } = req.body;
    const image = await Image.findOneAndUpdate(
      { _id: req.params.id, uploadedBy: req.user.id },
      { assignedTo: doctorId, status: 'assigned' },
      { new: true }
    ).populate('assignedTo', 'name specialization payoutRate');
    if (!image) return res.status(404).json({ message: 'Image not found' });
    res.json(image);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Assign task to doctor (doctor self-assigns)
router.patch('/assign/:id', auth, doctorOnly, async (req, res) => {
  const image = await Image.findByIdAndUpdate(
    req.params.id,
    { status: 'assigned', assignedTo: req.user.id },
    { new: true }
  );
  res.json(image);
});

// Get single image by ID — must be LAST
router.get('/:id', auth, async (req, res) => {
  try {
    const image = await Image.findById(req.params.id)
      .populate('uploadedBy', 'name organization');
    if (!image) return res.status(404).json({ message: 'Image not found' });
    res.json(image);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
