# Simple Escrow Service

A small Ethereum escrow contract for a blockchain hackathon. It lets a buyer lock ETH for a seller, then release the funds after the off-chain work is complete.

## Escrow Flow

1. Buyer creates a deal and deposits ETH.
2. Seller completes the agreed work off-chain.
3. Buyer releases the payment to the seller.
4. If the seller wants to cancel before release, the seller can request cancellation.
5. Buyer approves the cancellation and receives the refund.

## Project Structure

- `contracts/SimpleEscrow.sol` - Solidity escrow smart contract.
- `test/SimpleEscrow.test.js` - Hardhat tests for the main escrow flows.
- `scripts/deploy.js` - Deployment script.
- `hardhat.config.js` - Hardhat configuration.

## Setup

```bash
npm install
npm test
```

## Deploy Locally

```bash
npm run demo
npm run deploy:local
```

`npm run demo` deploys the contract, creates deal `#1`, and releases the payment on Hardhat's in-memory local network.

## Deploy To Sepolia

Create a `.env` file or export these variables in your shell:

```bash
export SEPOLIA_RPC_URL="https://your-sepolia-rpc-url"
export PRIVATE_KEY="your-wallet-private-key"
npm run deploy:sepolia
```

Never commit a real private key.

After deployment, use the printed contract address:

```bash
export ESCROW_ADDRESS="deployed-contract-address"
export SELLER_ADDRESS="seller-wallet-address"
export AMOUNT_ETH="0.01"
export DESCRIPTION="Build my hackathon landing page"
npm run create:sepolia
```

Then release payment as the buyer:

```bash
export ESCROW_ADDRESS="deployed-contract-address"
export DEAL_ID="1"
npm run release:sepolia
```

## Main Contract Functions

- `createDeal(address seller, string description)` - Buyer creates a funded deal by sending ETH.
- `releasePayment(uint256 dealId)` - Buyer releases escrowed ETH to the seller.
- `requestCancellation(uint256 dealId)` - Seller asks to cancel a funded deal.
- `approveRefund(uint256 dealId)` - Buyer approves cancellation and receives the refund.
- `getDeal(uint256 dealId)` - Reads deal details.

## Demo Idea

Use two wallets:

- Wallet A as the buyer.
- Wallet B as the seller.

Buyer creates a deal with 0.01 ETH, seller pretends to deliver the work, and buyer calls `releasePayment`. The event log proves the escrow finished successfully.
