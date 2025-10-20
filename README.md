# Volvi Options Protocol

A Vincent-powered options protocol with USDC-only liquidity and gasless trading.

## Overview

Volvi is a decentralized options protocol that leverages Vincent (built on Lit Protocol) to enable users to trade options through their non-custodial Agent Wallets. Users can create liquidity profiles, write options, and take options using only USDC - no ETH required for gas.

### Key Features

- 🔐 **Non-Custodial**: Users maintain full custody through Lit Protocol PKPs
- 💵 **USDC-Only**: No need to hold ETH for gas fees
- ⚡ **Gasless Trading**: All operations paid in USDC via Vincent abilities
- 🤖 **Automated Settlement**: Your app can settle expired options on behalf of users
- 🔑 **Multi-Auth**: Wallet, email, social login, passkeys via Vincent
- 📜 **Granular Permissions**: Users delegate specific actions only
- 🔄 **Revocable**: Users can revoke access anytime

## Architecture

```
packages/
├── frontend/          # React app with Vincent authentication
├── backend/           # Express API with Vincent middleware
├── abilities/         # Custom Vincent abilities (Lit Actions)
└── (contracts in /src # Solidity smart contracts
```

## Prerequisites

- Node.js >= 22.16.0
- pnpm >= 10.7.0
- A Vincent App registered at [dashboard.heyvincent.ai](https://dashboard.heyvincent.ai/)

## Quick Start

### 1. Install Dependencies

```bash
# Enable Corepack
corepack enable

# Install all dependencies
pnpm install
```

### 2. Set Up Environment Variables

#### Backend

Create `packages/backend/.env`:

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
USE_MONGODB=false

# Server
PORT=3001
NODE_ENV=development
CORS_ALLOWED_DOMAIN=http://localhost:5173

# Logging
LOG_LEVEL=info
```

#### Frontend

Create `packages/frontend/.env`:

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

### 3. Build All Packages

```bash
pnpm build
```

### 4. Run Development Servers

```bash
# Run all services in parallel
pnpm dev

# Or run individually:
pnpm dev:frontend  # Frontend on port 5173
pnpm dev:backend   # Backend on port 3001
```

## Vincent App Setup

### Register Your Vincent App

1. Go to [Vincent Dashboard](https://dashboard.heyvincent.ai/)
2. Click "Create New App"
3. Fill in app details:
   - **Name**: Volvi Options Protocol
   - **Description**: USDC-only options protocol with automated liquidity
   - **App User URL**: `http://localhost:5173` (or your deployed URL)
   - **Redirect URIs**: `http://localhost:5173/callback`
4. Generate delegatee keys (save the private key securely!)
5. Copy your App ID

### Add Abilities to Your App

You'll need to add these abilities:

1. **ERC20 Approval** (built-in Vincent ability)
   - For approving USDC spending

2. **Create Profile** (custom - to be published)
   - For creating liquidity profiles

3. **Create Offer** (custom - TODO)
4. **Take Option** (custom - TODO)
5. **Settle Option** (custom - TODO)

## Smart Contracts

The protocol uses two main contracts:

- `OptionsProtocol.sol`: Core options logic with liquidity profiles
- `OptionsProtocolGasless.sol`: Extends core with gasless functionality

### Deploy Contracts

```bash
# Base Sepolia (testnet)
forge script script/DeployBaseSepolia.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify

# Base Mainnet (production)
forge script script/DeployBase.s.sol \
  --rpc-url $BASE_RPC_URL \
  --broadcast \
  --verify
```

### Run Tests

```bash
forge test
forge test -vv          # Verbose
forge test --gas-report # Gas analysis
```

## Development Workflow

### 1. Creating a New Vincent Ability

See `packages/abilities/src/create-profile/` for a complete example.

**Structure:**
```typescript
ability/
├── schema.ts      # Zod parameter schema
├── precheck.ts    # Validation before execution
├── litAction.ts   # Lit Action code (runs in Lit network)
└── index.ts       # Bundle ability
```

**Steps:**
1. Create the ability in `packages/abilities/src/your-ability/`
2. Build: `pnpm --filter @volvi/abilities build`
3. Publish Lit Action to IPFS
4. Register in Vincent Dashboard
5. Add to your Vincent App

### 2. Adding a Backend Route

1. Create route handler in `packages/backend/src/lib/express/routes/`
2. Add ability client in `packages/backend/src/lib/abilities/clients.ts`
3. Register route in `packages/backend/src/lib/express/index.ts`

Example:

```typescript
// Route handler
export async function handleYourRoute(req: VincentAuthenticatedRequest, res: Response) {
  const pkpInfo = getPKPInfo(req.user.decodedJWT);
  const client = getYourAbilityClient();

  const precheckResult = await client.precheck(params, {
    delegatorPkpEthAddress: pkpInfo.ethAddress,
  });

  if (!precheckResult.success) {
    return res.status(400).json({ success: false, error: precheckResult.error });
  }

  const result = await client.execute(params, {
    delegatorPkpEthAddress: pkpInfo.ethAddress,
  });

  return res.json({ success: true, data: result.result });
}
```

### 3. Adding a Frontend Component

1. Create component in `packages/frontend/src/components/`
2. Use `useBackend()` hook for API calls
3. Use `useVincent()` hook for auth state

Example:

```typescript
import { useBackend } from '@/hooks/useBackend';

export function YourComponent() {
  const { yourMethod } = useBackend();

  const handleSubmit = async () => {
    try {
      const result = await yourMethod(params);
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  return <div>{/* Your UI */}</div>;
}
```

## User Flow

1. **Connect**: User connects wallet via Vincent (creates/connects Agent Wallet)
2. **Approve USDC**: User approves USDC spending (one-time, uses ERC20 Approval ability)
3. **Create Profile**: User deposits USDC to create liquidity profile
4. **Write Options**: User creates signed offers (EIP-712 signatures)
5. **Take Options**: Taker selects offer and pays premium + gas fee in USDC
6. **Settle**: Option settles at expiry (automated or manual)

## Production Deployment

### Backend (Railway/Heroku/etc)

1. Set environment variables in your platform
2. Deploy backend: `pnpm build:backend && pnpm start`
3. Update Vincent App URLs in dashboard

### Frontend (Vercel/Netlify/etc)

1. Set environment variables
2. Build: `pnpm build:frontend`
3. Deploy `packages/frontend/dist`
4. Update redirect URIs in Vincent Dashboard

### Abilities

1. Publish Lit Actions to IPFS
2. Register abilities in Vincent Dashboard with CIDs
3. Attach abilities to your Vincent App
4. Users must approve app with abilities

## Project Status

### Completed ✅
- [x] Monorepo structure
- [x] Smart contracts (OptionsProtocol + Gasless variant)
- [x] First Vincent ability (Create Profile)
- [x] Backend with Vincent auth
- [x] Frontend with Vincent SDK
- [x] Basic UI (Login + Dashboard)

### In Progress 🚧
- [ ] Create Offer ability
- [ ] Take Option ability
- [ ] Settle Option ability
- [ ] Database integration (MongoDB)
- [ ] Orderbook management
- [ ] Position tracking
- [ ] Complete UI components

### Planned 📋
- [ ] Publish abilities to IPFS
- [ ] Register Vincent App in production
- [ ] Deploy to Base mainnet
- [ ] Testing & audit
- [ ] Documentation
- [ ] Launch 🚀

## Documentation

- [Vincent Implementation Plan](docs/VINCENT_IMPLEMENTATION_PLAN.md) - Detailed 7-phase implementation plan
- [Complete Specification](docs/COMPLETE_SPECIFICATION.md) - Original protocol specification
- [Vincent Roadmap](docs/vincent-roadmap.md) - Vincent migration roadmap
- [Vincent Starter App](docs/vincent-starter-app/) - Reference DCA example

## Resources

- **Vincent Docs**: https://docs.heyvincent.ai/
- **Vincent Dashboard**: https://dashboard.heyvincent.ai/
- **Lit Protocol**: https://developer.litprotocol.com/
- **Base**: https://docs.base.org/

## Security

- **Non-Custodial**: Users own their PKP (Agent Wallet) as an NFT
- **Delegated Execution**: App executes on behalf of users via Lit Protocol
- **Granular Permissions**: Users approve specific abilities only
- **Revocable**: Users can revoke app access anytime
- **Auditable**: All delegations recorded on-chain

## License

MIT

## Support

For issues or questions:
- GitHub Issues: [Create an issue](https://github.com/yourorg/volvi/issues)
- Vincent Discord: [Join Vincent community](https://discord.gg/lit-protocol)

---

**Built with Vincent & Lit Protocol** 🚀
