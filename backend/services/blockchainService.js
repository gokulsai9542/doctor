/**
 * blockchainService.js
 * Wraps all ethers.js interactions with the MedAnnotate smart contract.
 * Gracefully degrades — if blockchain is not configured, operations are skipped.
 */

const { ethers } = require('ethers');
const crypto     = require('crypto');
const path       = require('path');
const fs         = require('fs');

// ── Config ─────────────────────────────────────────────────────────────────────

// Support both Sepolia (new) and Polygon Amoy (legacy) via same env vars
const RPC_URL         = process.env.SEPOLIA_RPC_URL      ||
                        process.env.POLYGON_RPC_URL       || '';
const PRIVATE_KEY     = process.env.DEPLOYER_PRIVATE_KEY  || '';
const CONTRACT_ADDR   = process.env.CONTRACT_ADDRESS      || '';
const BLOCKCHAIN_ON   = !!(RPC_URL && PRIVATE_KEY && CONTRACT_ADDR);
const NETWORK_NAME    = process.env.SEPOLIA_RPC_URL ? 'Sepolia' : 'Polygon Amoy';

let provider, signer, contract;

if (BLOCKCHAIN_ON) {
  try {
    const abiPath = path.join(__dirname, '../../contracts/MedAnnotate.abi.json');
    const abi     = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    provider      = new ethers.JsonRpcProvider(RPC_URL);
    signer        = new ethers.Wallet(PRIVATE_KEY, provider);
    contract      = new ethers.Contract(CONTRACT_ADDR, abi, signer);
    console.log(`[Blockchain] ✅ Connected to contract on ${NETWORK_NAME}:`, CONTRACT_ADDR);
  } catch (err) {
    console.warn('[Blockchain] ⚠️  Init failed:', err.message);
  }
} else {
  console.log('[Blockchain] ℹ️  Not configured — running in off-chain mode');
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Generate SHA-256 hash of annotation data.
 * Returns a 0x-prefixed hex string (bytes32 compatible).
 */
function hashAnnotation(annotationData) {
  const json   = JSON.stringify(annotationData, Object.keys(annotationData).sort());
  const digest = crypto.createHash('sha256').update(json).digest('hex');
  return '0x' + digest;
}

/**
 * Convert hex hash string to bytes32 for Solidity.
 */
function toBytes32(hexHash) {
  return ethers.zeroPadValue(hexHash, 32);
}

// ── Service Functions ──────────────────────────────────────────────────────────

/**
 * Store annotation hash on-chain when doctor submits.
 * @returns { txHash, annotationHash } or null if blockchain is off
 */
async function storeAnnotationOnChain(annotationId, doctorWalletAddress, annotationData, ipfsHash = '') {
  const annotationHash = hashAnnotation(annotationData);

  if (!BLOCKCHAIN_ON || !contract) {
    return { txHash: null, annotationHash, onChain: false };
  }

  // Use zero address if doctor hasn't connected wallet
  const doctorAddr = doctorWalletAddress && ethers.isAddress(doctorWalletAddress)
    ? doctorWalletAddress
    : ethers.ZeroAddress;

  try {
    const tx = await contract.storeAnnotation(
      annotationId,
      doctorAddr,
      toBytes32(annotationHash),
      ipfsHash || ''
    );
    const receipt = await tx.wait();
    console.log(`[Blockchain] Annotation stored: ${receipt.hash}`);
    return { txHash: receipt.hash, annotationHash, onChain: true };
  } catch (err) {
    console.error('[Blockchain] storeAnnotation failed:', err.message);
    return { txHash: null, annotationHash, onChain: false, error: err.message };
  }
}

/**
 * Approve annotation on-chain (triggers auto payment release if escrowed).
 */
async function approveAnnotationOnChain(annotationId) {
  if (!BLOCKCHAIN_ON || !contract) return { txHash: null, onChain: false };
  try {
    const tx      = await contract.approveAnnotation(annotationId);
    const receipt = await tx.wait();
    console.log(`[Blockchain] Annotation approved: ${receipt.hash}`);
    return { txHash: receipt.hash, onChain: true };
  } catch (err) {
    console.error('[Blockchain] approveAnnotation failed:', err.message);
    return { txHash: null, onChain: false, error: err.message };
  }
}

/**
 * Reject annotation on-chain (updates reputation).
 */
async function rejectAnnotationOnChain(annotationId) {
  if (!BLOCKCHAIN_ON || !contract) return { txHash: null, onChain: false };
  try {
    const tx      = await contract.rejectAnnotation(annotationId);
    const receipt = await tx.wait();
    return { txHash: receipt.hash, onChain: true };
  } catch (err) {
    console.error('[Blockchain] rejectAnnotation failed:', err.message);
    return { txHash: null, onChain: false, error: err.message };
  }
}

/**
 * Release payment on-chain manually (if not auto-released).
 */
async function releasePaymentOnChain(annotationId) {
  if (!BLOCKCHAIN_ON || !contract) return { txHash: null, onChain: false };
  try {
    const tx      = await contract.releasePayment(annotationId);
    const receipt = await tx.wait();
    console.log(`[Blockchain] Payment released: ${receipt.hash}`);
    return { txHash: receipt.hash, onChain: true };
  } catch (err) {
    console.error('[Blockchain] releasePayment failed:', err.message);
    return { txHash: null, onChain: false, error: err.message };
  }
}

/**
 * Read annotation record from chain.
 */
async function getAnnotationFromChain(annotationId) {
  if (!BLOCKCHAIN_ON || !contract) return null;
  try {
    const record = await contract.getAnnotation(annotationId);
    return {
      annotationId:  record.annotationId,
      doctorAddress: record.doctorAddress,
      dataHash:      record.dataHash,
      ipfsHash:      record.ipfsHash,
      timestamp:     Number(record.timestamp),
      approved:      record.approved,
      exists:        record.exists,
    };
  } catch (err) {
    console.error('[Blockchain] getAnnotation failed:', err.message);
    return null;
  }
}

/**
 * Read doctor reputation from chain.
 */
async function getDoctorReputation(walletAddress) {
  if (!BLOCKCHAIN_ON || !contract || !ethers.isAddress(walletAddress)) return null;
  try {
    const rep = await contract.getReputation(walletAddress);
    return {
      totalAnnotations: Number(rep.totalAnnotations),
      approvedCount:    Number(rep.approvedCount),
      rejectedCount:    Number(rep.rejectedCount),
      reputationScore:  Number(rep.reputationScore),
    };
  } catch (err) {
    console.error('[Blockchain] getReputation failed:', err.message);
    return null;
  }
}

/**
 * Verify annotation integrity — compare stored hash vs recomputed hash.
 */
async function verifyAnnotationIntegrity(annotationId, annotationData) {
  if (!BLOCKCHAIN_ON || !contract) return { verified: false, onChain: false };
  try {
    const hash     = hashAnnotation(annotationData);
    const verified = await contract.verifyAnnotation(annotationId, toBytes32(hash));
    return { verified, onChain: true, hash };
  } catch (err) {
    return { verified: false, onChain: false, error: err.message };
  }
}

/**
 * Send ETH directly to a doctor wallet (backend-triggered payment).
 * Uses the deployer wallet as the sender.
 */
async function sendEthPayment(toAddress, amountEth) {
  if (!BLOCKCHAIN_ON || !signer) return { txHash: null, onChain: false };
  if (!ethers.isAddress(toAddress)) return { txHash: null, onChain: false, error: 'Invalid address' };
  try {
    const tx = await signer.sendTransaction({
      to:    toAddress,
      value: ethers.parseEther(String(amountEth)),
    });
    const receipt = await tx.wait();
    console.log(`[Blockchain] ETH sent to ${toAddress}: ${receipt.hash}`);
    return { txHash: receipt.hash, onChain: true, status: receipt.status === 1 ? 'paid' : 'failed' };
  } catch (err) {
    console.error('[Blockchain] sendEthPayment failed:', err.message);
    return { txHash: null, onChain: false, error: err.message };
  }
}

module.exports = {
  hashAnnotation,
  storeAnnotationOnChain,
  approveAnnotationOnChain,
  rejectAnnotationOnChain,
  releasePaymentOnChain,
  getAnnotationFromChain,
  getDoctorReputation,
  verifyAnnotationIntegrity,
  sendEthPayment,
  isBlockchainEnabled: () => BLOCKCHAIN_ON && !!contract,
  getNetworkName: () => NETWORK_NAME,
};
