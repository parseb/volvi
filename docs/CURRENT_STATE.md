# Volvi Options Protocol - Current State

**Last Updated**: 2025-10-21
**Status**: Phase 4 Complete ✅

## Overview

The Volvi Options Protocol is a Vincent-powered decentralized options platform that enables USDC-only, gasless options trading through non-custodial Agent Wallets. The project has successfully completed 4 phases of implementation with all core infrastructure in place.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  - Vincent Authentication (PKP Agent Wallets)                │
│  - Dashboard UI (Profiles, Offers, Positions)                │
│  - Real-time Orderbook & Position Tracking                   │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/REST API
┌────────────────────▼────────────────────────────────────────┐
│                  Backend (Express)                           │
│  - Vincent JWT Middleware                                    │
│  - Ability Execution (via Lit Protocol)                      │
│  - MongoDB Integration                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼──────┐ ┌──▼────────┐ ┌▼──────────────┐
│   MongoDB    │ │    Lit    │ │ Smart Contract│
│   Database   │ │  Protocol │ │  (Base Chain) │
│              │ │   (PKPs)  │ │               │
│ - Profiles   │ │ - Abilities│ │ - Options     │
│ - Offers     │ │ - Actions │ │ - Liquidity   │
│ - Positions  │ │           │ │ - Settlement  │
└──────────────┘ └───────────┘ └───────────────┘
```

## Implementation Status

### ✅ Phase 1: Foundation (COMPLETE)

**Goal**: Set up project structure and core Vincent integration

**Completed**:
- ✅ Monorepo structure with pnpm workspaces
- ✅ Three packages: abilities, backend, frontend
- ✅ Vincent SDK integration in all packages
- ✅ First Vincent ability (Create Profile)
- ✅ Backend with Vincent JWT authentication
- ✅ Frontend with Vincent authentication flow
- ✅ Environment configuration

**Files**:
- [README.md](../README.md) - Project overview and setup
- [pnpm-workspace.yaml](../pnpm-workspace.yaml) - Workspace configuration
- [packages/abilities/](../packages/abilities/) - Custom abilities package
- [packages/backend/](../packages/backend/) - Express backend
- [packages/frontend/](../packages/frontend/) - React frontend

### ✅ Phase 2: Core Abilities (COMPLETE)

**Goal**: Implement all four Vincent abilities for the options protocol

**Completed**:
- ✅ Create Profile ability - Create USDC liquidity profiles
- ✅ Create Offer ability - Sign EIP-712 option offers
- ✅ Take Option ability - Gasless option taking with EIP-3009
- ✅ Settle Option ability - Settle expired options

**Abilities Implemented**:

1. **Create Profile** ([packages/abilities/src/create-profile/](../packages/abilities/src/create-profile/))
   - Schema: USDC amount, max lock days, minimum unit, minimum premium
   - Precheck: Validates USDC approval and balance
   - Lit Action: Calls `createProfile()` on OptionsProtocol contract
   - Policies: Spending limit, time lock

2. **Create Offer** ([packages/abilities/src/create-offer/](../packages/abilities/src/create-offer/))
   - Schema: Profile ID, underlying, collateral, premium, duration range
   - Precheck: Validates profile ownership and available liquidity
   - Lit Action: Signs EIP-712 offer with PKP
   - Policies: Token whitelist, premium floor, duration limits

3. **Take Option** ([packages/abilities/src/take-option/](../packages/abilities/src/take-option/))
   - Schema: Offer, fill amount, duration, EIP-3009 payment auth
   - Precheck: Validates offer signature and USDC payment authorization
   - Lit Action: Calls `takeOptionGasless()` with payment
   - Policies: Spending limit, exposure limit, token whitelist

4. **Settle Option** ([packages/abilities/src/settle-option/](../packages/abilities/src/settle-option/))
   - Schema: Token ID
   - Precheck: Validates option is expired and not yet settled
   - Lit Action: Calls `settleOption()` to claim profits
   - Policies: Auto-settle

**Backend Routes**:
- `POST /profiles` - Create liquidity profile
- `POST /offers` - Create option offer
- `GET /orderbook` - Get active offers
- `POST /take` - Take an option
- `POST /settle` - Settle expired option
- `GET /positions` - Get user's positions

### ✅ Phase 3: Frontend UI (COMPLETE)

**Goal**: Complete user interface for all operations

**Completed**:
- ✅ CreateProfileForm - Create USDC liquidity profiles
- ✅ CreateOfferForm - Create option offers
- ✅ Orderbook - Browse and take active offers
- ✅ PositionsList - View and settle positions
- ✅ TakeOptionModal - Take options with premium calculation
- ✅ DashboardPage - Tab navigation for all features

**Features**:
- Auto-refresh every 30 seconds for orderbook and positions
- Real-time premium calculation based on duration
- Loading states and error handling
- Unit conversion (human-readable ↔ contract units)
- Responsive design with Tailwind CSS
- Type-safe API integration via useBackend hook

**Components** ([packages/frontend/src/components/](../packages/frontend/src/components/)):
- `CreateProfileForm.tsx` - Profile creation with USDC input
- `CreateOfferForm.tsx` - Offer creation with all parameters
- `Orderbook.tsx` - Table of active offers with take button
- `PositionsList.tsx` - Grid of user positions with settlement
- `TakeOptionModal.tsx` - Modal for taking options
- `DashboardPage.tsx` - Main dashboard with tabs

### ✅ Phase 4: Database Integration (COMPLETE)

**Goal**: Persistent storage for profiles, offers, and positions

**Completed**:
- ✅ MongoDB schemas with Zod validation
- ✅ Connection management with singleton pattern
- ✅ Complete storage layer with CRUD operations
- ✅ All backend routes integrated with database
- ✅ Optimized indexes for fast queries
- ✅ Graceful startup and shutdown
- ✅ Transaction audit logging

**Database Layer** ([packages/backend/src/db/](../packages/backend/src/db/)):

**Schemas** ([schemas.ts](../packages/backend/src/db/schemas.ts)):
- `Profile` - Liquidity profile data
- `Offer` - Option offers with EIP-712 signatures
- `Position` - Option positions (NFTs)
- `TransactionLog` - Audit trail

**Connection** ([connection.ts](../packages/backend/src/db/connection.ts)):
- Singleton MongoDB connection
- Automatic index creation
- Type-safe collection accessors
- Health check function

**Storage** ([storage.ts](../packages/backend/src/db/storage.ts)):
- Profile CRUD: `createProfile()`, `getProfileById()`, `getProfilesByOwner()`
- Offer CRUD: `createOffer()`, `getActiveOffers()`, `updateOfferFilledAmount()`
- Position CRUD: `createPosition()`, `getPositionsByOwner()`, `settlePosition()`
- Transaction logging: `logTransaction()`, `getTransactionsByUser()`
- Analytics: `getProtocolStats()`

**Indexes Created**:
- Profiles: profileId (unique), owner, createdAt
- Offers: offerHash (unique), writer, profileId, compound (cancelled, deadline)
- Positions: tokenId (unique), owner, writer, compound (owner, settled)
- Transaction logs: txHash (unique), user, type, createdAt

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **State Management**: React Query (TanStack Query)
- **Styling**: Tailwind CSS
- **Authentication**: Vincent SDK (Agent Wallets)
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript
- **Authentication**: Vincent App SDK with JWT middleware
- **Database**: MongoDB with native driver
- **Validation**: Zod schemas
- **Logging**: Pino (structured JSON logging)

### Abilities
- **Platform**: Lit Protocol with Vincent SDK
- **Signing**: PKP (Agent Wallet) signatures
- **Actions**: Lit Actions (JavaScript executed in TEE)
- **Validation**: Zod parameter schemas

### Smart Contracts (Foundry)
- **Language**: Solidity 0.8.20
- **Framework**: Foundry (forge, cast, anvil)
- **Network**: Base (mainnet & sepolia testnet)
- **Standards**: ERC-721 (option NFTs), EIP-712 (offer signatures), EIP-3009 (gasless payments)

## Current Capabilities

### Users Can:

1. **Connect** via Vincent
   - Email, social login, wallet, or passkeys
   - Non-custodial Agent Wallet (PKP) created automatically
   - No ETH required for gas

2. **Create Liquidity Profiles**
   - Deposit USDC to create profile
   - Set liquidity parameters (max lock, min unit, min premium)
   - Track multiple profiles per user

3. **Write Options**
   - Create signed offers (EIP-712)
   - Set collateral, premium, duration range
   - Post to orderbook for takers

4. **Take Options**
   - Browse active offers in orderbook
   - Select amount and duration
   - Pay premium + gas fee in USDC (gasless via EIP-3009)
   - Receive option NFT

5. **Settle Options**
   - View all positions with expiry times
   - Settle expired options
   - Claim profits (if ITM)

### App Can (with delegated permissions):

- Execute abilities on behalf of users via PKP
- Submit transactions without user's ETH
- Settle options automatically (if user grants policy)
- Enforce spending limits and token whitelists

## What's Working

✅ Complete monorepo structure
✅ Vincent authentication flow
✅ All four Vincent abilities implemented
✅ Backend API with JWT authentication
✅ Frontend UI with all components
✅ MongoDB integration with all routes
✅ Database schemas and indexes
✅ Transaction audit logging
✅ Real-time orderbook
✅ Position tracking
✅ Unit conversions
✅ Error handling
✅ Auto-refresh

## What's NOT Yet Done

### 🚧 Phase 5: Ability Publishing & Testing

**Remaining Tasks**:

1. **Publish Abilities to IPFS**
   - Upload Lit Action code to IPFS
   - Get CIDs for each ability
   - Update ability clients with CIDs

2. **Register in Vincent Dashboard**
   - Create Vincent App in production
   - Register all four abilities
   - Configure ability parameters

3. **Smart Contract Deployment**
   - Deploy OptionsProtocol to Base Sepolia
   - Deploy OptionsProtocolGasless variant
   - Verify contracts on BaseScan

4. **End-to-End Testing**
   - Test full user flow from profile creation to settlement
   - Verify database persistence
   - Test gasless transactions
   - Validate EIP-712 signatures

5. **Production Deployment**
   - Deploy backend to hosting platform
   - Deploy frontend to Vercel/Netlify
   - Set up production MongoDB instance
   - Configure environment variables

### 📋 Future Enhancements

- Price oracle integration (Pyth Network)
- Automated settlement bot
- Advanced analytics dashboard
- Liquidity mining / rewards
- Multi-chain support
- Additional option types (spreads, strangles)
- AMM-style pricing
- Governance / DAO

## Environment Setup

### Backend (.env)

```bash
# Vincent Configuration
VINCENT_APP_ID=your_app_id_here
DELEGATEE_PRIVATE_KEY=0x...
ALLOWED_AUDIENCE=http://localhost:5173,https://yourdomain.com

# Network Configuration
CHAIN_ID=84532
RPC_URL=https://sepolia.base.org
OPTIONS_PROTOCOL_ADDRESS=0x...

# Database
MONGODB_URI=mongodb://localhost:27017/volvi-options
USE_MONGODB=true

# Server
PORT=3001
NODE_ENV=development
CORS_ALLOWED_DOMAIN=http://localhost:5173

# Logging
LOG_LEVEL=info
```

### Frontend (.env)

```bash
# Vincent Configuration
VITE_VINCENT_APP_ID=your_app_id_here
VITE_REDIRECT_URI=http://localhost:5173/callback

# Backend API
VITE_BACKEND_URL=http://localhost:3001

# Network
VITE_CHAIN_ID=84532
VITE_RPC_URL=https://sepolia.base.org
VITE_OPTIONS_PROTOCOL_ADDRESS=0x...

# Environment
VITE_ENV=development
```

## Development Workflow

### Running the Application

```bash
# Install dependencies
pnpm install

# Run all services
pnpm dev

# Or run individually
pnpm dev:frontend  # http://localhost:5173
pnpm dev:backend   # http://localhost:3001
```

### Building

```bash
# Build all packages
pnpm build

# Build individually
pnpm build:abilities
pnpm build:backend
pnpm build:frontend
```

**Note**: Backend TypeScript build may encounter memory issues due to large Vincent SDK type definitions. Use `tsx` for development or increase memory:

```bash
NODE_OPTIONS="--max-old-space-size=8192" pnpm build:backend
```

### Testing

```bash
# Run tests
pnpm test

# Smart contract tests
cd src && forge test
```

## Documentation

- [README.md](../README.md) - Quick start and overview
- [VINCENT_IMPLEMENTATION_PLAN.md](VINCENT_IMPLEMENTATION_PLAN.md) - 7-phase implementation plan
- [PHASE3_COMPLETE.md](PHASE3_COMPLETE.md) - Frontend UI completion
- [PHASE4_COMPLETE.md](PHASE4_COMPLETE.md) - Database integration completion
- [COMPLETE_SPECIFICATION.md](COMPLETE_SPECIFICATION.md) - Original protocol specification
- [vincent-roadmap.md](vincent-roadmap.md) - Vincent migration roadmap

## Key Files

### Abilities
- [packages/abilities/src/create-profile/](../packages/abilities/src/create-profile/) - Create Profile ability
- [packages/abilities/src/create-offer/](../packages/abilities/src/create-offer/) - Create Offer ability
- [packages/abilities/src/take-option/](../packages/abilities/src/take-option/) - Take Option ability
- [packages/abilities/src/settle-option/](../packages/abilities/src/settle-option/) - Settle Option ability

### Backend
- [packages/backend/src/index.ts](../packages/backend/src/index.ts) - Server startup with DB init
- [packages/backend/src/lib/express/index.ts](../packages/backend/src/lib/express/index.ts) - Route registration
- [packages/backend/src/lib/abilities/clients.ts](../packages/backend/src/lib/abilities/clients.ts) - Ability clients
- [packages/backend/src/db/](../packages/backend/src/db/) - Database layer

### Frontend
- [packages/frontend/src/pages/DashboardPage.tsx](../packages/frontend/src/pages/DashboardPage.tsx) - Main dashboard
- [packages/frontend/src/hooks/useBackend.ts](../packages/frontend/src/hooks/useBackend.ts) - API client hook
- [packages/frontend/src/components/](../packages/frontend/src/components/) - UI components

## Next Steps

To complete the Volvi Options Protocol:

1. **Deploy Smart Contracts** to Base Sepolia
2. **Publish Abilities** to IPFS and get CIDs
3. **Register Vincent App** in production dashboard
4. **Update Environment Variables** with contract addresses and app ID
5. **End-to-End Testing** of full user flow
6. **Production Deployment** of backend and frontend
7. **User Onboarding** documentation and tutorials

## Resources

- **Vincent Docs**: https://docs.heyvincent.ai/
- **Vincent Dashboard**: https://dashboard.heyvincent.ai/
- **Lit Protocol**: https://developer.litprotocol.com/
- **Base Docs**: https://docs.base.org/

---

**Project Status**: 4/5 Phases Complete (80%)
**Next Phase**: Ability Publishing & Testing
**Ready for**: Smart contract deployment and production setup
