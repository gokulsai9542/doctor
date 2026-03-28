const mongoose = require('mongoose');

const annotationSchema = new mongoose.Schema({
  image:  { type: mongoose.Schema.Types.ObjectId, ref: 'Image', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  labels: [{
    category:    { type: String, required: true },
    type:        { type: String, enum: ['bbox', 'polygon'], required: true },
    coordinates: { type: mongoose.Schema.Types.Mixed, required: true },
  }],
  status:          { type: String, enum: ['submitted', 'approved', 'rejected'], default: 'submitted' },
  adminNote:        { type: String },
  doctorNotes:      { type: String },
  payoutAmount:     { type: Number, default: 5 },
  // AI features
  aiSuggestions:    { type: mongoose.Schema.Types.Mixed },  // boxes suggested by AI
  confidenceScore:  { type: Number, default: null },        // IoU-based score 0-1
  aiConfidence:     { type: Number, default: null },        // raw model confidence
  difficulty:       { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  flagged:          { type: Boolean, default: false },
  metadataStripped: { type: Boolean, default: false },
  // Web3
  annotationHash:   { type: String, default: null },  // SHA-256 of annotation data
  blockchainTxHash: { type: String, default: null },  // on-chain tx hash
  ipfsHash:         { type: String, default: null },  // IPFS CID
  onChain:          { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Annotation', annotationSchema);
