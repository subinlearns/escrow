# Redline Escrow Frontend

React + Tailwind UI for the `SimpleEscrow` contract in `../backend`.

## Setup

```bash
npm install
cp .env.example .env
```

Set the deployed contract address:

```bash
VITE_ESCROW_ADDRESS=0xYourDeployedEscrowContract
```

## Run

```bash
npm run dev
```

Open the printed local URL, connect MetaMask, and use Sepolia if your backend contract is deployed on Sepolia.

## Actions

- Buyer creates an escrow by entering seller address, amount, and description.
- Buyer releases payment while the deal is funded.
- Seller requests cancellation while the deal is funded.
- Buyer approves refund after seller requests cancellation.
