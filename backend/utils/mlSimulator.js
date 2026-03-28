// Simulates CNN model training with realistic epoch-by-epoch accuracy/loss progression

const simulateCNNTraining = async (job, MLJob) => {
  const epochs   = job.epochs;
  const epochLogs = [];

  // Simulate training — accuracy improves, loss decreases over epochs
  for (let epoch = 1; epoch <= epochs; epoch++) {
    await new Promise(r => setTimeout(r, 800)); // 0.8s per epoch

    const progress  = epoch / epochs;
    const noise     = (Math.random() - 0.5) * 0.04;
    const accuracy  = Math.min(0.99, 0.45 + progress * 0.50 + noise);
    const loss      = Math.max(0.01, 0.95 - progress * 0.85 + Math.abs(noise));

    epochLogs.push({
      epoch,
      accuracy: parseFloat((accuracy * 100).toFixed(2)),
      loss:     parseFloat(loss.toFixed(4)),
    });

    await MLJob.findByIdAndUpdate(job._id, {
      currentEpoch: epoch,
      status:       'training',
      epochLogs,
      accuracy:     parseFloat((accuracy * 100).toFixed(2)),
      loss:         parseFloat(loss.toFixed(4)),
    });
  }

  // Final model saved
  const finalAccuracy = epochLogs[epochLogs.length - 1].accuracy;
  const modelPath     = `models/cnn_medannotate_${Date.now()}.h5`;

  await MLJob.findByIdAndUpdate(job._id, {
    status:      'completed',
    accuracy:    finalAccuracy,
    modelPath,
    completedAt: new Date(),
  });
};

module.exports = { simulateCNNTraining };
