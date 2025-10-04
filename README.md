# Options Protocol

A decentralized options protocol for ERC-20 tokens with signature-based orderbook, partial fills, and multi-chain support.

## Features

- 📝 **EIP-712 Signature-based Orderbook** - Gas-efficient off-chain order matching
- 🔄 **Partial Fills** - Fill any portion of an offer without nonces
- 🎨 **ERC-721 Options** - Transferable option positions as NFTs
- 💰 **Flexible Premiums** - Writers set premium/day, takers choose duration
- 🔮 **Oracle Integration** - Pyth primary, Uniswap V3 fallback
- 🌐 **Multi-chain Ready** - Initially deployed on Base
- 🔐 **Multi-auth** - Wallet, email, and social login via Reown

## Architecture

```
options-protocol/
├── src/               # Solidity smart contracts
├── backend/           # Express API + PostgreSQL
├── indexer/           # Event indexer service
├── frontend/          # Next.js application
└── test/              # Foundry tests
```

## Quick Start

### Prerequisites

- Node.js 18+
- Foundry
- PostgreSQL 14+
- pnpm (or npm/yarn)

### Installation

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
cd backend && pnpm db:setup

# Build contracts
forge build

# Run tests
forge test -vvv

# Start development
pnpm dev
```

## Smart Contracts

### Core Contract: `OptionsProtocol.sol`

- **Token Configs**: Flexible per-token configuration with emergency override
- **Signature Verification**: EIP-712 typed data signatures
- **Partial Fills**: Track filled amounts without nonces
- **Settlement**: Multi-oracle price feeds with fallback
- **Broadcaster Role**: Controlled order broadcast to events

### Deployment

```bash
# Deploy to Base Sepolia (testnet)
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast

# Deploy to Base (mainnet)
forge script script/Deploy.s.sol --rpc-url $BASE_RPC_URL --broadcast --verify
```

## Backend Services

### API Server (Port 3001)

- `GET /api/orderbook/:token` - Get orderbook for token
- `POST /api/offers` - Submit new offer (broadcaster only)
- `GET /api/positions/:address` - Get user positions
- `GET /api/config/:token` - Get token configuration

### Indexer Service

Monitors on-chain events and updates PostgreSQL:
- `OrderBroadcast` - New orders
- `OptionTaken` - Partial fills
- `OptionSettled` - Settlements
- Validates offers periodically

## Frontend

Built with Next.js 14 and Reown AppKit:

- **Landing Page**: Orderbook with price×size sorting
- **Taker Interface**: Duration/size sliders for filtering
- **Writer Interface**: Create and sign offers
- **Positions Page**: View active positions with P&L

### Development

```bash
cd frontend
pnpm dev
```

Visit `http://localhost:3000`

## Testing

```bash
# Run all tests
forge test

# Run with verbosity
forge test -vvv

# Run specific test
forge test --match-test testTakeCallOption -vvv

# Gas report
forge test --gas-report
```

## Railway Deployment

```bash
# Configure Railway CLI
railway login

# Link project
railway link

# Deploy
railway up
```

### Railway Services

1. **Backend API** - Express server
2. **Indexer** - Event monitoring service
3. **PostgreSQL** - Database
4. **Frontend** - Next.js application

## License

MIT
