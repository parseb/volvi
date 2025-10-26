# Volvi Options Protocol

A decentralized options protocol built on Base Mainnet with Vincent authentication, enabling USDC-based options trading with PKP-powered execution.

## 🌐 Live Deployment

- **Frontend**: [https://app.volvi.xyz](https://app.volvi.xyz)
- **Network**: Base Mainnet (Chain ID: 8453)
- **Protocol Address**: `0x0c239d161780747763E13Bee4366Ad44D347608F`

## 📋 Overview

Volvi is a permissionless options protocol that allows users to:
- Create call and put options on any ERC20 token
- Trade options using USDC as the settlement currency
- Execute options with PKP (Programmable Key Pair) wallets via Vincent authentication
- Settle options on-chain with automated premium and collateral management

## 🏗️ Architecture

### Smart Contracts

- **VolviOptionsProtocol.sol**: Core options protocol contract
- **Collateral**: USDC-only (Base Mainnet: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`)
- **Price Oracle**: Pyth Network (`0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a`)
- **Uniswap Integration**: V3 Router for token swaps

### Backend

- **Framework**: Express.js with TypeScript
- **Runtime**: tsx (TypeScript execution)
- **Authentication**: Vincent SDK for PKP-based auth
- **Database**: MongoDB (optional, for profiles and orderbook)
- **Deployment**: Railway

### Frontend

- **Framework**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query
- **Routing**: React Router
- **Authentication**: Vincent SDK (integration in progress)
- **Deployment**: Railway

## 🚀 Getting Started

### Prerequisites

- Node.js >= 22.16.0
- pnpm >= 10.7.0
- MongoDB (optional, for database features)

### Installation

```bash
# Clone the repository
git clone https://github.com/parseb/volvi.git
cd volvi

# Install dependencies
pnpm install

# Set up environment variables
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env

# Edit .env files with your configuration
```

### Development

```bash
# Run backend
pnpm dev:backend

# Run frontend
pnpm dev:frontend

# Run both in parallel
pnpm dev
```

### Build

```bash
# Build all packages
pnpm build

# Build specific package
pnpm build:backend
pnpm build:frontend
```

## 🔧 Configuration

### Backend Environment Variables

```bash
# Network
CHAIN_ID=8453
RPC_URL=https://mainnet.base.org

# Contracts
OPTIONS_PROTOCOL_ADDRESS=0x0c239d161780747763E13Bee4366Ad44D347608F
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Vincent Authentication
VINCENT_APP_ID=your-vincent-app-id
ALLOWED_AUDIENCE=https://app.volvi.xyz
CORS_ALLOWED_DOMAIN=https://app.volvi.xyz

# MongoDB (Optional)
USE_MONGODB=false
MONGODB_URI=your-mongodb-uri

# Server
PORT=3000
NODE_ENV=production
```

### Frontend Environment Variables

```bash
# Network
VITE_CHAIN_ID=8453
VITE_RPC_URL=https://mainnet.base.org

# Contracts
VITE_OPTIONS_PROTOCOL_ADDRESS=0x0c239d161780747763E13Bee4366Ad44D347608F

# Vincent Authentication
VITE_VINCENT_APP_ID=your-vincent-app-id
VITE_REDIRECT_URI=https://app.volvi.xyz/callback

# Environment
VITE_ENV=production
```

## 📦 Vincent Abilities

The protocol uses four custom Vincent abilities for PKP wallet operations:

1. **@lit-protocol/vincent-ability-erc20-approval** - ERC20 token approvals
2. **@volvi/vincent-ability-create-offer** - Create options offers
3. **@volvi/vincent-ability-take-option** - Take/buy options
4. **@volvi/vincent-ability-settle-option** - Settle options on-chain

All abilities are published to npm and IPFS for decentralized access.

## 🛠️ Tech Stack

### Smart Contracts
- Solidity ^0.8.20
- Foundry for testing and deployment
- OpenZeppelin contracts
- Uniswap V3 integration
- Pyth Network price feeds

### Backend
- Node.js + TypeScript
- Express.js
- Vincent SDK for authentication
- MongoDB for storage
- Ethers.js v6 for blockchain interaction
- Zod for validation

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- TanStack Query
- React Router
- Vincent SDK

## 📝 API Endpoints

### Public Endpoints
- `GET /health` - Health check

### Authenticated Endpoints (Vincent PKP required)
- `POST /profiles` - Create user profile
- `POST /offers` - Create options offer
- `GET /orderbook` - Get available options
- `POST /take` - Take/buy an option
- `POST /settle` - Settle an option
- `GET /positions` - Get user positions

## 🔐 Security

- Vincent SDK for PKP-based authentication
- CORS protection with domain whitelisting
- Helmet.js for security headers
- Input validation with Zod schemas
- Environment variable protection

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

Built with ❤️ using Vincent SDK and deployed on Base Mainnet
