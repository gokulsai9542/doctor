const router   = require('express').Router();
const axios    = require('axios');
const FormData = require('form-data');
const multer   = require('multer');
const sharp    = require('sharp');
const { auth } = require('../middleware/auth');

const FLASK_URL = process.env.FLASK_ML_URL || 'http://localhost:5001';
const upload    = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/ai/suggest — fetch image from Cloudinary URL, send to Flask, return boxes + disease predictions
router.post('/suggest', auth, async (req, res) => {
  const { imageUrl, modality = 'xray' } = req.body;
  if (!imageUrl) return res.status(400).json({ message: 'imageUrl required' });

  try {
    const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
    const buffer = Buffer.from(imgRes.data);

    const form = new FormData();
    form.append('image', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
    form.append('modality', modality);

    const flaskRes = await axios.post(`${FLASK_URL}/suggest`, form, {
      headers: { ...form.getHeaders() },
      timeout: 30000,
    });

    const data = flaskRes.data;
    console.log(`[AI Suggest] source=${data.source} boxes=${data.boxes?.length} top_disease=${data.diseases?.[0]?.disease}`);

    return res.json({
      boxes:      data.boxes      || [],
      confidence: data.confidence ?? 0,
      label:      data.label      || 'region',
      total:      data.total      || data.boxes?.length || 0,
      source:     data.source     || 'unknown',
      diseases:   data.diseases   || [],
    });

  } catch (err) {
    console.error('[AI Suggest] Error:', err.message);
    return res.json({
      boxes: [], confidence: 0, label: 'unknown',
      total: 0, source: 'flask_unavailable', diseases: [], error: err.message,
    });
  }
});

// GET /api/ai/health — check if Flask is running
router.get('/health', auth, async (req, res) => {
  try {
    const { data } = await axios.get(`${FLASK_URL}/health`, { timeout: 5000 });
    res.json(data);
  } catch (err) {
    res.json({ status: 'unavailable', error: err.message });
  }
});

// POST /api/ai/strip-metadata — remove EXIF/metadata from image
router.post('/strip-metadata', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file provided' });
    const cleaned = await sharp(req.file.buffer).withMetadata(false).toBuffer();
    res.set('Content-Type', req.file.mimetype);
    res.send(cleaned);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
