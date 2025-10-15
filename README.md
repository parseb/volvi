# Options Protocol

Decentralized options protocol with signature-based orderbook, gasless transactions, and CoW Protocol integration on Base.

## 🚀 Quick Start

```bash
npm start
```

That's it! Opens:
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:3001
- **Local Fork:** http://127.0.0.1:8545 (auto-funded test accounts)

**📖 Full guides:** [QUICK_START.md](./QUICK_START.md) | [RAILWAY_QUICK_START.md](./RAILWAY_QUICK_START.md)

## ✨ Features

✅ **Gasless Transactions** - Users pay only USDC, no ETH needed
✅ **Signature-based Orderbook** - Off-chain offers via EIP-712
✅ **Partial Fills** - Take any amount from an offer
✅ **CoW Protocol Settlement** - MEV-protected, automated settlement
✅ **Pyth Oracle** - Reliable pricing with Uniswap fallback
✅ **Multi-auth** - Wallet, passkey, email, and social login via Reown
✅ **Optimized** - 24KB contract fits Ethereum's size limit
✅ **Production Ready** - Docker + Railway deployment included

## 📁 Architecture

```
options-protocol/
├── src/                          # Solidity smart contracts
│   ├── OptionsProtocol.sol
│   └── OptionsProtocolGasless.sol (deployed)
├── backend/                      # Express API + Storage
│   ├── src/
│   │   ├── routes.ts             # API endpoints
│   │   ├── storage.ts            # In-memory/PostgreSQL storage
│   │   ├── cow.ts                # CoW Protocol integration
│   │   ├── pyth.ts               # Pyth oracle client
│   │   └── db/
│   │       ├── postgres.ts       # PostgreSQL adapter
│   │       └── redis.ts          # Redis caching
│   └── Dockerfile                # Production container
├── frontend/                     # Next.js application
│   ├── app/                      # App router pages
│   ├── components/               # React components
│   ├── lib/                      # Hooks and utilities
│   └── Dockerfile                # Production container
├── test/                         # Foundry tests (18/18 passing)
└── script/                       # Deployment scripts
```

## 🔧 Prerequisites

- **Node.js** 18+
- **Foundry** (for contracts)
- **Docker** (optional, for production deployment)

## 🏃 Development

### Installation

```bash
# Install dependencies
npm install

# Setup environment
cp .env.docker .env
# Edit .env with your values

# Build contracts
forge build

# Run tests
forge test -vv
```

### Local Development

```bash
# Start everything (fork + backend + frontend)
npm start

# Or start individual services
npm run dev:backend
npm run dev:frontend
npm run fork
```

### Local Fork

The `npm start` command automatically:
1. Starts an Anvil fork of Base mainnet
2. Deploys contracts
3. Funds test accounts with ETH, USDC, WETH
4. Starts backend and frontend

Test accounts are pre-funded and ready to use!

## 🎯 Smart Contracts

### OptionsProtocolGasless

The main contract with gasless functionality:

- **EIP-712** signatures for offers
- **EIP-3009** gasless USDC payments
- **EIP-1271** CoW Protocol integration
- **Multi-oracle** pricing (Pyth + Uniswap V3)
- **Partial fills** without nonces
- **Settlement hooks** for automated settlement

### Deployments

| Network | Address | Chain ID |
|---------|---------|----------|
| Sepolia | `0xdF1AbDe2967F54E391b6d8FBC655F15847cf87ce` | 11155111 |
| Base Sepolia | `0xD7AFfB2B3303e9Cb44C9d9aFA6bD938200b3C8F2` | 84532 |

See [DEPLOYMENT_INFO.md](./DEPLOYMENT_INFO.md) for full details.

### Deploy New Contract

```bash
# Deploy to Sepolia
forge script script/DeploySepolia.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast

# Deploy to Base Sepolia
forge script script/DeployBaseSepolia.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
```

## 🔌 Backend API

Express.js API with TypeScript:

### Storage Options

**In-Memory (Development):**
```bash
USE_POSTGRES=false npm run dev:backend
```

**PostgreSQL (Production):**
```bash
USE_POSTGRES=true npm run dev:backend
```

### Key Endpoints

```
GET  /api/orderbook/:token          Get orderbook
POST /api/offers                    Submit offer
GET  /api/positions/:address        Get positions
POST /api/settlements/initiate      Create settlement
POST /api/settlements/approve       Approve settlement
```

## 🎨 Frontend

Next.js 14 with Reown AppKit:

- **Landing Page** - Orderbook with filtering
- **Portfolio** - Active positions with P&L
- **Writer Interface** - Create signed offers
- **Settlement UI** - CoW Protocol integration

### Configuration

```bash
# frontend/.env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_REOWN_PROJECT_ID=your_project_id
NEXT_PUBLIC_DEFAULT_CHAIN_ID=11155111
```

## 🧪 Testing

```bash
# Run all tests
forge test

# Verbose output
forge test -vv

# Specific test
forge test --match-test testTakeOptionGasless -vvv

# Gas report
forge test --gas-report
```

**Status:** ✅ 18/18 tests passing

## 🐳 Docker Deployment

### Local Development

```bash
# Build and start all services
npm run docker:build
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

Services include:
- PostgreSQL (persistent storage)
- Redis (caching)
- Backend (API)
- Frontend (Next.js)

See [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) for full guide.

## ☁️ Railway Deployment

Deploy to production with Railway.app:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and link project
railway login
railway link

# Deploy
railway up
```

### Railway Setup

1. Create project at railway.app
2. Add PostgreSQL service (from template)
3. Add Redis service (from template)
4. Deploy backend (from GitHub)
5. Deploy frontend (from GitHub)
6. Configure environment variables

**Cost:** ~$6/month (includes $5 credit)

See [RAILWAY_QUICK_START.md](./RAILWAY_QUICK_START.md) for detailed guide.

## 📊 Contract Size Optimization

**Challenge:** Original contract was 24,653 bytes (77 over limit)
**Solution:** Optimized to 24,168 bytes (408 bytes under limit)

**Techniques:**
- Changed `optimizer_runs=1` (deployment size priority)
- Removed whitespace from declarations
- Shortened error messages
- Consolidated code structure

See `foundry.toml` for optimizer configuration.

## 📚 Documentation

### 📖 Start Here
- **[COMPLETE_SPECIFICATION.md](./COMPLETE_SPECIFICATION.md)** - 🌟 **Complete technical specification (all-in-one)**

### Quick Start Guides
- [QUICK_START.md](./QUICK_START.md) - Local development setup
- [RAILWAY_QUICK_START.md](./RAILWAY_QUICK_START.md) - Deploy to Railway in 5 minutes

### Deployment Guides
- [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) - Docker containerization guide
- [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) - Railway cloud deployment guide
- [DEPLOYMENT_INFO.md](./DEPLOYMENT_INFO.md) - Contract addresses and network info

### Status & Architecture
- [PROTOCOL_STATUS.md](./PROTOCOL_STATUS.md) - Production readiness status
- [PRODUCTION_STORAGE_STRATEGY.md](./PRODUCTION_STORAGE_STRATEGY.md) - Storage options (PostgreSQL/Redis)

### Additional Resources
- [COW_INTEGRATION_SUMMARY.md](./COW_INTEGRATION_SUMMARY.md) - CoW Protocol integration details
- [CONTAINERIZATION_COMPLETE.md](./CONTAINERIZATION_COMPLETE.md) - Docker setup summary

## 🔐 Security

- **Self-Custodial** - No deposits or withdrawals
- **Time-Bounded** - Signatures expire
- **Single-Use Nonces** - Prevent replay attacks
- **MEV Protection** - Via CoW Protocol batch auctions
- **Access Control** - Role-based permissions

## 🛠️ Tech Stack

**Smart Contracts:**
- Solidity 0.8.20
- Foundry
- OpenZeppelin

**Backend:**
- Node.js 18+ / TypeScript
- Express.js
- PostgreSQL + Redis (production)
- ethers.js v6

**Frontend:**
- Next.js 14 (App Router)
- React 18 / TypeScript
- Reown AppKit (formerly WalletConnect)
- wagmi v2 + viem v2
- Tailwind CSS

**Infrastructure:**
- Docker + Docker Compose
- Railway.app (hosting)
- GitHub Actions (CI/CD)

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT

## 🔗 Links

- **Deployed Contracts:** [DEPLOYMENT_INFO.md](./DEPLOYMENT_INFO.md)
- **Pyth Network:** https://pyth.network
- **CoW Protocol:** https://cow.fi
- **Base Chain:** https://base.org
- **Reown:** https://reown.com

## 🆘 Troubleshooting

**Backend won't start:**
- Check `.env` file exists
- Verify RPC URLs are accessible
- Check Node.js version is 18+

**Frontend connection issues:**
- Verify backend is running on port 3001
- Check Reown project ID is set
- Ensure wallet is connected to correct network

**Docker issues:**
- Run `npm run docker:clean` to reset
- Check ports 3000, 3001, 5432, 6379 aren't in use
- View logs with `npm run docker:logs`

**For more help, see the troubleshooting sections in:**
- [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md#troubleshooting)
- [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md#troubleshooting)

---

**Status:** ✅ Production Ready
**Last Updated:** October 14, 2025
**Version:** 1.5 (Gasless + CoW Protocol + Docker + Railway)
