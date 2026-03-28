import { ShieldCheck, ShieldX, ExternalLink } from 'lucide-react';

// Supports both Sepolia and Polygon Amoy tx hashes
const getExplorerUrl = (txHash) => {
  // Sepolia and Ethereum hashes are indistinguishable by format;
  // default to Sepolia since that's the active network
  return `https://sepolia.etherscan.io/tx/${txHash}`;
};

/**
 * BlockchainBadge — shows on-chain verification status for an annotation.
 *
 * Props:
 *   txHash    {string}  — blockchain transaction hash
 *   onChain   {boolean} — whether it was stored on-chain
 *   compact   {boolean} — small inline version
 */
export default function BlockchainBadge({ txHash, onChain, compact = false }) {
  if (!onChain && !txHash) {
    return compact ? null : (
      <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-700/40 px-2 py-0.5 rounded-full">
        <ShieldX size={11} /> Off-chain
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full font-medium">
      <ShieldCheck size={11} />
      {compact ? 'On-chain' : 'Blockchain Verified'}
      {txHash && (
        <a
          href={getExplorerUrl(txHash)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="ml-0.5 hover:text-emerald-300 transition-colors"
          title="View on PolygonScan"
        >
          <ExternalLink size={10} />
        </a>
      )}
    </span>
  );
}
