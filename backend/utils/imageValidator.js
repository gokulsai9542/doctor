const { Jimp } = require('jimp');

const validateMedicalImage = async (buffer) => {
  const img = await Jimp.read(buffer);
  img.resize({ w: 128, h: 128 });

  const data  = img.bitmap.data;
  const total = img.bitmap.width * img.bitmap.height;

  let coloredPixels   = 0;
  let totalSaturation = 0;
  let sepiaPixels     = 0;
  const brightness    = [];

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const diff = maxC - minC;

    totalSaturation += maxC === 0 ? 0 : diff / maxC;

    // Sepia/yellowish pixel — old X-rays often have warm tones
    // Sepia: R > G > B with moderate differences
    const isSepia = r > g && g > b && (r - b) < 80 && diff < 60;
    if (isSepia) sepiaPixels++;

    // Colored pixel: large channel difference AND not sepia-like
    if (diff > 30 && !isSepia) coloredPixels++;

    brightness.push(0.299 * r + 0.587 * g + 0.114 * b);
  }

  const colorRatio    = coloredPixels / total;
  const sepiaRatio    = sepiaPixels / total;
  const avgSaturation = totalSaturation / total;
  const avgBright     = brightness.reduce((a, v) => a + v, 0) / total;
  const stdDev        = Math.sqrt(brightness.reduce((s, v) => s + (v - avgBright) ** 2, 0) / total);

  // Old X-rays: sepia-toned but still medical — allow if sepia dominates
  const isOldXray = sepiaRatio > 0.3 && colorRatio < 0.20;

  // Relaxed thresholds:
  // - colorRatio > 0.30 (was 0.25) — more tolerance for slight color casts
  // - avgSaturation > 0.25 (was 0.20) — more tolerance
  // - stdDev > 15 (was 25) — old X-rays have lower contrast
  const isColorful  = colorRatio > 0.30 && avgSaturation > 0.25;
  const hasContrast = stdDev > 15;
  const isMedical   = (!isColorful || isOldXray) && hasContrast;

  console.log(
    `[ImageValidator] colorRatio=${colorRatio.toFixed(3)} sepiaRatio=${sepiaRatio.toFixed(3)} ` +
    `saturation=${avgSaturation.toFixed(3)} stdDev=${stdDev.toFixed(1)} ` +
    `oldXray=${isOldXray} → ${isMedical ? 'MEDICAL ✅' : 'NON-MEDICAL ❌'}`
  );

  let reason = null;
  if (!isMedical) {
    if (isColorful)
      reason = `Colorful image detected (color ratio: ${(colorRatio * 100).toFixed(1)}%, saturation: ${(avgSaturation * 100).toFixed(1)}%). Only grayscale or medical images (X-ray, MRI, CT) are allowed.`;
    else
      reason = `Image has insufficient contrast (${stdDev.toFixed(1)}). Please upload a clearer medical image.`;
  }

  return {
    isMedical,
    colorRatio:    parseFloat(colorRatio.toFixed(4)),
    sepiaRatio:    parseFloat(sepiaRatio.toFixed(4)),
    avgSaturation: parseFloat(avgSaturation.toFixed(4)),
    stdDev:        parseFloat(stdDev.toFixed(2)),
    reason,
  };
};

module.exports = { validateMedicalImage };
