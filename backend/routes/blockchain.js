const router     = require('express').Router();
const User       = require('../models/User');
const Annotation = require('../models/Annotation');
const { auth }   = require('../middleware/auth');
const {
  getAnnotationFromChain,
  getDoctorReputation,
  verifyAnnotationIntegrity,
  isBlockchainEnabled,
} = require('../services/blockchainService');

// GET /api/blockchain/status — check if blockchain is live
router.get('/status', (req, res) => {
  res.json({
    enabled:         isBlockchainEnabled(),
    contractAddress: process.env.CONTRACT_ADDRESS || null,
    network:         'Polygon Amoy Testnet',
    chainId:         80002,
  });
});

// PATCH /api/blockchain/wallet — doctor saves their MetaMask wallet address
router.patch('/wallet', auth, async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) return res.status(400).json({ message: 'walletAddress required' });

    // Basic address format check
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ message: 'Invalid Ethereum address format' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { walletAddress },
      { new: true }
    ).select('-password');

    res.json({ message: 'Wallet address saved', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/blockchain/verify/:annotationId — verify annotation integrity on-chain
router.get('/verify/:annotationId', auth, async (req, res) => {
  try {
    const annotation = await Annotation.findById(req.params.annotationId);
    if (!annotation) return res.status(404).json({ message: 'Annotation not found' });

    // Recompute hash from stored data
    const annotationData = {
      imageId:  annotation.image.toString(),
      doctorId: annotation.doctor.toString(),
      labels:   annotation.labels,
    };

    const result = await verifyAnnotationIntegrity(
      annotation._id.toString(),
      annotationData
    );

    const chainRecord = await getAnnotationFromChain(annotation._id.toString());

    res.json({
      annotationId:    annotation._id,
      blockchainTxHash: annotation.blockchainTxHash || null,
      annotationHash:  annotation.annotationHash || null,
      onChain:         result.onChain,
      verified:        result.verified,
      chainRecord,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/blockchain/reputation/:walletAddress — get doctor reputation from chain
router.get('/reputation/:walletAddress', auth, async (req, res) => {
  try {
    const rep = await getDoctorReputation(req.params.walletAddress);
    if (!rep) {
      return res.json({ onChain: false, message: 'No on-chain reputation found' });
    }
    res.json({ onChain: true, ...rep });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/blockchain/annotation/:annotationId — read raw chain record
router.get('/annotation/:annotationId', auth, async (req, res) => {
  try {
    const record = await getAnnotationFromChain(req.params.annotationId);
    if (!record) return res.json({ onChain: false });
    res.json({ onChain: true, record });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
