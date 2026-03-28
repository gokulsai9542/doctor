/**
 * aiUtils.js
 * - IoU calculation between two boxes
 * - Confidence score: average IoU between doctor boxes and AI suggestions
 * - Difficulty + dynamic pricing
 */

// Intersection over Union for two boxes {x,y,w,h}
const iou = (a, b) => {
  const ax2 = a.x + a.w, ay2 = a.y + a.h;
  const bx2 = b.x + b.w, by2 = b.y + b.h;
  const ix1 = Math.max(a.x, b.x), iy1 = Math.max(a.y, b.y);
  const ix2 = Math.min(ax2, bx2),  iy2 = Math.min(ay2, by2);
  const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
  if (inter === 0) return 0;
  const union = a.w * a.h + b.w * b.h - inter;
  return inter / union;
};

/**
 * Calculate annotation confidence score (0–1)
 * Compares doctor's bbox labels against AI suggested boxes using IoU.
 * If no AI suggestions exist, returns null (unscored).
 */
const calcConfidenceScore = (doctorLabels, aiSuggestions) => {
  if (!aiSuggestions || aiSuggestions.length === 0) return null;

  const bboxLabels = doctorLabels.filter(l => l.type === 'bbox');
  if (bboxLabels.length === 0) return null;

  let totalIoU = 0;
  let matched  = 0;

  bboxLabels.forEach(label => {
    const [x, y, w, h] = label.coordinates;
    const docBox = { x, y, w, h };
    // Find best matching AI box
    const bestIoU = Math.max(0, ...aiSuggestions.map(ai => iou(docBox, ai)));
    totalIoU += bestIoU;
    matched++;
  });

  return matched > 0 ? parseFloat((totalIoU / matched).toFixed(3)) : null;
};

/**
 * Determine difficulty and dynamic payout
 * - easy:   AI confidence > 0.8, few boxes → base pay
 * - medium: AI confidence 0.5–0.8 → 1.5x
 * - hard:   AI confidence < 0.5 or many boxes → 2x
 */
const calcDifficultyAndPayout = (aiConfidence, numBoxes, baseRate = 5) => {
  let difficulty, multiplier;

  if (aiConfidence === null || aiConfidence === undefined) {
    difficulty = 'medium'; multiplier = 1.5;
  } else if (aiConfidence >= 0.80 && numBoxes <= 3) {
    difficulty = 'easy';   multiplier = 1.0;
  } else if (aiConfidence >= 0.50) {
    difficulty = 'medium'; multiplier = 1.5;
  } else {
    difficulty = 'hard';   multiplier = 2.0;
  }

  // More boxes = more work
  if (numBoxes > 5) multiplier += 0.5;

  return {
    difficulty,
    payoutAmount: parseFloat((baseRate * multiplier).toFixed(2)),
  };
};

module.exports = { calcConfidenceScore, calcDifficultyAndPayout, iou };
