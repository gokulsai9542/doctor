import { createContext, useContext } from 'react';

// Minimal stub — wallet connection removed, mock Razorpay payment is used instead.
// Blockchain annotation hashing still works via backend blockchainService.js (off-chain mode).
const Web3Context = createContext({});

export function Web3Provider({ children }) {
  return <Web3Context.Provider value={{}}>{children}</Web3Context.Provider>;
}

export const useWeb3 = () => useContext(Web3Context);
