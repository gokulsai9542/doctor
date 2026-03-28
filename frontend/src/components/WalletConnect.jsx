import { useState } from 'react';
import { Wallet, Unplug, Loader, ChevronDown, X } from 'lucide-react';
import { useWeb3 } from '../context/Web3Context';

const METHOD_LABELS = {
  web3auth:      { icon: '🔐', label: 'Google',        color: 'text-blue-400' },
  walletconnect: { icon: '🔗', label: 'WalletConnect', color: 'text-blue-500' },
  metamask:      { icon: '🦊', label: 'MetaMask',      color: 'text-orange-400' },
};

export default function WalletConnect({ compact = false }) {
  const {
    walletAddress, shortAddress, connecting,
    loginMethod, userInfo,
    connectWithGoogle, connectWithWalletConnect, connectWithMetaMask,
    disconnectWallet,
  } = useWeb3();

  const [showModal, setShowModal] = useState(false);

  if (connecting) {
    return (
      <button disabled className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-600/20 text-purple-300 text-xs font-medium">
        <Loader size={13} className="animate-spin" />
        {compact ? '...' : 'Connecting...'}
      </button>
    );
  }

  if (walletAddress) {
    const method = METHOD_LABELS[loginMethod] || { icon: '💼', label: 'Wallet', color: 'text-emerald-400' };
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-600/30 text-emerald-300 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{method.icon}</span>
          {!compact && (
            <>
              <span className={method.color}>{method.label}</span>
              <span className="text-slate-400">·</span>
            </>
          )}
          <span>{shortAddress}</span>
          {!compact && <span className="text-slate-500 text-xs">Sepolia</span>}
        </div>
        <button
          onClick={disconnectWallet}
          title="Disconnect wallet"
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <Unplug size={13} />
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium transition-colors"
      >
        <Wallet size={13} />
        {compact ? 'Connect' : 'Connect Wallet'}
      </button>

      {/* Connection modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-slate-800 font-semibold text-lg">Connect Wallet</h3>
                <p className="text-slate-400 text-xs mt-0.5">Choose how to connect</p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Google via Web3Auth — recommended */}
              <button
                onClick={() => { setShowModal(false); connectWithGoogle(); }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-blue-100 hover:border-blue-400 hover:bg-blue-50 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-xl flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-5 h-5">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <div className="text-left flex-1">
                  <p className="text-slate-800 font-semibold text-sm">Continue with Google</p>
                  <p className="text-slate-400 text-xs">Auto wallet — no MetaMask needed</p>
                </div>
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">Recommended</span>
              </button>

              {/* WalletConnect */}
              <button
                onClick={() => { setShowModal(false); connectWithWalletConnect(); }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-blue-300 hover:bg-slate-50 transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 300 185" className="w-6 h-6 fill-white">
                    <path d="M61.4385 36.2562C110.349 -12.0187 189.65 -12.0187 238.561 36.2562L244.448 42.0196C246.893 44.4171 246.893 48.3004 244.448 50.6979L224.311 70.4878C223.088 71.6866 221.106 71.6866 219.883 70.4878L211.723 62.4697C177.404 28.5793 122.596 28.5793 88.2771 62.4697L79.5435 71.0476C78.3208 72.2464 76.3385 72.2464 75.1158 71.0476L54.9789 51.2577C52.5337 48.8602 52.5337 44.9769 54.9789 42.5794L61.4385 36.2562ZM280.206 77.0301L298.197 94.7762C300.642 97.1737 300.642 101.057 298.197 103.454L216.216 183.765C213.771 186.163 209.806 186.163 207.361 183.765L148.617 126.021C148.005 125.421 147.014 125.421 146.402 126.021L87.6585 183.765C85.2133 186.163 81.2481 186.163 78.8029 183.765L-3.17824 103.454C-5.62345 101.057 -5.62345 97.1737 -3.17824 94.7762L14.8127 77.0301C17.2579 74.6326 21.2231 74.6326 23.6683 77.0301L82.4124 134.774C83.0245 135.374 84.0157 135.374 84.6278 134.774L143.372 77.0301C145.817 74.6326 149.782 74.6326 152.227 77.0301L210.971 134.774C211.583 135.374 212.574 135.374 213.186 134.774L271.931 77.0301C274.376 74.6326 278.341 74.6326 280.786 77.0301H280.206Z"/>
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-slate-800 font-semibold text-sm">WalletConnect</p>
                  <p className="text-slate-400 text-xs">Trust Wallet, Coinbase & more</p>
                </div>
              </button>

              {/* MetaMask */}
              <button
                onClick={() => { setShowModal(false); connectWithMetaMask(); }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-orange-300 hover:bg-orange-50/50 transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center text-2xl flex-shrink-0">
                  🦊
                </div>
                <div className="text-left">
                  <p className="text-slate-800 font-semibold text-sm">MetaMask</p>
                  <p className="text-slate-400 text-xs">Browser extension wallet</p>
                </div>
              </button>
            </div>

            <p className="text-center text-xs text-slate-400 mt-5">
              Connects to <span className="font-medium text-slate-600">Sepolia Testnet</span> · No real funds
            </p>
          </div>
        </div>
      )}
    </>
  );
}
