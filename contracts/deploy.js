/**
 * deploy.js — Deploy MedAnnotate contract to Polygon Amoy testnet
 *
 * Setup:
 *   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
 *   npx hardhat init  (choose "empty hardhat.config.js")
 *
 * Then replace hardhat.config.js with the config below, and run:
 *   npx hardhat run contracts/deploy.js --network amoy
 */

// ── hardhat.config.js (copy this to project root) ─────────────────────────────
/*
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "./backend/.env" });

module.exports = {
  solidity: "0.8.20",
  networks: {
    amoy: {
      url: process.env.POLYGON_RPC_URL || "https://rpc-amoy.polygon.technology",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      chainId: 80002,
    },
  },
};
*/
// ──────────────────────────────────────────────────────────────────────────────

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MATIC");

  const MedAnnotate = await hre.ethers.getContractFactory("MedAnnotate");
  const contract    = await MedAnnotate.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("\n✅ MedAnnotate deployed to:", address);
  console.log("Add to backend/.env:");
  console.log(`CONTRACT_ADDRESS=${address}`);
  console.log(`POLYGON_RPC_URL=https://rpc-amoy.polygon.technology`);
}

main().catch((err) => { console.error(err); process.exit(1); });
