const cloudinary     = require('cloudinary').v2;
const axios          = require('axios');
const FormData       = require('form-data');
const crypto         = require('crypto');
const streamifier    = require('streamifier');
const Image          = require('../models/Image');
const notify         = require('../utils/notify');
const User           = require('../models/User');
const RejectedUpload = require('../models/RejectedUpload');
const { validateMedicalImage } = require('../utils/imageValidator');

const FLASK_URL            = process.env.FLASK_ML_URL || 'http://localhost:5001';
const CONFIDENCE_THRESHOLD = 0.70;
const ALLOWED_LABELS       = ['xray', 'mri', 'ct'];

// Specialization keywords for auto-assign
const SPECIALIZATION_MAP = {
  xray: ['radiologist', 'radiology'],
  mri:  ['neurologist', 'neurology', 'neuroradiology'],
  ct:   ['radiologist', 'radiology', 'general'],
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload buffer to Cloudinary via stream
const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, allowed_formats: ['jpg', 'png', 'jpeg'] },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// Call Flask /predict endpoint
const callFlaskPredict = async (buffer, mimetype, originalname) => {
  const form = new FormData();
  form.append('image', buffer, { filename: originalname, contentType: mimetype });
  const response = await axios.post(`${FLASK_URL}/predict`, form, {
    headers: form.getHeaders(),
    timeout: 15000,
  });
  return response.data;
};

// Find best matching doctor by specialization
const findDoctorForModality = async (modality) => {
  const keywords = SPECIALIZATION_MAP[modality] || [];
  const doctors  = await User.find({ role: 'doctor' });
  return (
    doctors.find(
      (d) =>
        d.specialization &&
        keywords.some((k) => d.specialization.toLowerCase().includes(k))
    ) || null
  );
};

// ── Main upload handler ───────────────────────────────────────────────────────
const uploadImage = async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ message: 'No image file provided' });

  // 1. MIME type check
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (!allowedMimes.includes(file.mimetype)) {
    await RejectedUpload.create({
      uploadedBy: req.user.id, originalName: file.originalname,
      mimeType: file.mimetype, sizeBytes: file.size,
      reason: 'invalid_mime', ip: req.ip,
    });
    return res.status(400).json({ message: `Invalid file type. Only JPG/PNG allowed.` });
  }

  // 2. File size check (5MB)
  if (file.size > 5 * 1024 * 1024) {
    await RejectedUpload.create({
      uploadedBy: req.user.id, originalName: file.originalname,
      mimeType: file.mimetype, sizeBytes: file.size,
      reason: 'too_large', ip: req.ip,
    });
    return res.status(400).json({ message: 'File too large. Maximum 5MB allowed.' });
  }

  // 3. Duplicate hash check
  const imageHash = crypto.createHash('md5').update(file.buffer).digest('hex');
  const duplicate = await Image.findOne({ imageHash });
  if (duplicate) {
    return res.status(409).json({
      message: 'Duplicate image. This image was already uploaded.',
      existingId: duplicate._id,
    });
  }

  // 4. Pixel-level medical image validation (always runs, no Flask needed)
  try {
    const pixelCheck = await validateMedicalImage(file.buffer);
    console.log(`[Pixel Validation] colorRatio=${pixelCheck.colorRatio} saturation=${pixelCheck.avgSaturation} stdDev=${pixelCheck.stdDev} isMedical=${pixelCheck.isMedical}`);

    if (!pixelCheck.isMedical) {
      await RejectedUpload.create({
        uploadedBy: req.user.id, originalName: file.originalname,
        mimeType: file.mimetype, sizeBytes: file.size,
        reason: 'non_medical', ip: req.ip,
        aiLabel: 'other', aiConfidence: 0,
      });
      return res.status(400).json({
        message: `Only medical images (X-ray, MRI, CT scan) are allowed. ${pixelCheck.reason}`,
        details: {
          colorRatio:    pixelCheck.colorRatio,
          avgSaturation: pixelCheck.avgSaturation,
          contrast:      pixelCheck.stdDev,
        },
      });
    }
  } catch (err) {
    console.error('[Pixel Validation] Error:', err.message);
    // Don't block upload if validator itself crashes
  }

  // 5. AI validation via Flask (skipped if AI_VALIDATION_ENABLED=false)
  const AI_ENABLED = process.env.AI_VALIDATION_ENABLED !== 'false';
  let aiResult = null;
  let label, confidence, all_scores;

  if (AI_ENABLED) {
    try {
      aiResult = await callFlaskPredict(file.buffer, file.mimetype, file.originalname);
    } catch (err) {
      console.error('[AI Validation] Flask unavailable:', err.message);
      await RejectedUpload.create({
        uploadedBy: req.user.id, originalName: file.originalname,
        mimeType: file.mimetype, sizeBytes: file.size,
        reason: 'ai_unavailable', ip: req.ip,
      });
      return res.status(503).json({ message: 'AI validation service unavailable. Try again later.' });
    }

    label      = aiResult.label;
    confidence = aiResult.confidence;
    all_scores = aiResult.all_scores;

    // 5. Reject non-medical or low-confidence
    if (!ALLOWED_LABELS.includes(label) || confidence < CONFIDENCE_THRESHOLD) {
      const reason = !ALLOWED_LABELS.includes(label) ? 'non_medical' : 'low_confidence';
      await RejectedUpload.create({
        uploadedBy: req.user.id, originalName: file.originalname,
        mimeType: file.mimetype, sizeBytes: file.size,
        aiLabel: label, aiConfidence: confidence, allScores: all_scores,
        reason, ip: req.ip,
      });
      return res.status(400).json({
        message:
          reason === 'non_medical'
            ? `Only medical images allowed. Detected: "${label}" (${(confidence * 100).toFixed(1)}% confidence).`
            : `Low confidence (${(confidence * 100).toFixed(1)}%). Minimum required: ${CONFIDENCE_THRESHOLD * 100}%.`,
        label, confidence, all_scores,
      });
    }
  } else {
    // AI disabled — use modality from request body as fallback
    label      = req.body.modality || 'xray';
    confidence = 1.0;
    all_scores = { [label]: 1.0 };
    console.log(`[AI Validation] DISABLED — using modality from request: ${label}`);
  }

  // 6. Upload to Cloudinary
  let cloudResult;
  try {
    cloudResult = await uploadToCloudinary(file.buffer, 'medannotate');
  } catch (err) {
    return res.status(500).json({ message: `Cloudinary upload failed: ${err.message}` });
  }

  // 7. Use manually selected doctor from body, or auto-assign by specialization
  let matchedDoctor = null;
  if (req.body.assignedTo) {
    matchedDoctor = await User.findById(req.body.assignedTo);
  } else {
    matchedDoctor = await findDoctorForModality(label);
  }

  // 8. Save to DB
  let image;
  try {
  image = await Image.create({
    url:          cloudResult.secure_url,
    publicId:     cloudResult.public_id,
    modality:     label,
    uploadedBy:   req.user.id,
    providerNote: req.body.providerNote || '',
    imageHash,
    aiLabel:      label,
    aiConfidence: confidence,
    aiAllScores:  all_scores,
    status:       matchedDoctor ? 'assigned' : 'pending',
    assignedTo:   matchedDoctor ? matchedDoctor._id : null,
    autoAssigned: !!matchedDoctor,
  });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Duplicate image. This image was already uploaded.' });
    }
    return res.status(500).json({ message: err.message });
  }

  // Notify assigned doctor
  if (matchedDoctor) {
    await notify(matchedDoctor._id, {
      title:   'New Annotation Task',
      message: `A new ${label.toUpperCase()} image has been assigned to you for annotation.`,
      type:    'image_uploaded',
      link:    `/annotate/${image._id}`,
    });
  }

  return res.status(201).json({
    image,
    aiValidation: { label, confidence, all_scores },
    autoAssigned: matchedDoctor
      ? { doctor: matchedDoctor.name, specialization: matchedDoctor.specialization }
      : null,
  });

  // Notify assigned doctor
  if (matchedDoctor) {
    await notify(matchedDoctor._id, {
      title:   'New Annotation Task',
      message: `A new ${label.toUpperCase()} image has been assigned to you for annotation.`,
      type:    'image_uploaded',
      link:    `/annotate/${image._id}`,
    });
  }
};

module.exports = { uploadImage };
