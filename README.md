# Options Protocol

Decentralized options protocol with signature-based orderbook and gasless transactions on Base.

## Quick Start 🚀

```bash
npm start
```

That's it! Opens:
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:3001
- **Fork:** http://127.0.0.1:8545

**📖 Full guide:** [START.md](./START.md)

## Features

✅ **Gasless Transactions** - Users sign EIP-3009, backend pays gas
✅ **Signature-based Orderbook** - Off-chain offers, on-chain settlement
✅ **Partial Fills** - Take any amount from an offer
✅ **Pyth Oracle** - Reliable pricing with Uniswap fallback
✅ **$1 Flat Fee** - Simple pricing, covers gas costs
✅ **Base Optimized** - Cheap transactions, fast settlement
✅ **Multi-auth** - Wallet, passkey, email, and social login via Reown

## Architecture

```
options-protocol/
├── src/                       # Solidity smart contracts
│   ├── OptionsProtocol.sol
│   └── OptionsProtocolGasless.sol
├── backend/                   # Express API + PostgreSQL
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
