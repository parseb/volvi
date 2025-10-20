# Vincent-Based Options Protocol - Implementation Plan

**Version:** 1.0
**Date:** October 20, 2025
**Status:** Planning Phase

---

## Overview

Transform the existing options protocol into a Vincent-powered application where users can:
- **Write options** (create liquidity profiles and offers) via their Agent Wallet
- **Take options** gaslessly using USDC-only with Vincent abilities
- **Settle options** automatically through Vincent's delegated execution
- Maintain full custody through Lit Protocol PKPs (Programmable Key Pairs)

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         USER                                    │
│  1. Creates/connects Agent Wallet (PKP via Lit Protocol)       │
│  2. Delegates permissions to Options Vincent App                │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 │ Vincent JWT (auth token)
                 ▼
┌────────────────────────────────────────────────────────────────┐
│                   FRONTEND (React/Next.js)                      │
│  • Vincent Auth Integration (@lit-protocol/vincent-app-sdk)    │
│  • Liquidity Profile Creation UI                               │
│  • Options Writer UI (create offers with allocations)          │
│  • Options Taker UI (take options gaslessly)                   │
│  • Position Management & Settlement                             │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 │ API Calls (JWT in header)
                 ▼
┌────────────────────────────────────────────────────────────────┐
│                    BACKEND (Express.js)                         │
│  • Vincent Auth Middleware (validates JWT)                     │
│  • Orderbook Management                                         │
│  • Settlement Coordination                                      │
│  • Execute Vincent Abilities on behalf of users                │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 │ Ability Execution
                 ▼
┌────────────────────────────────────────────────────────────────┐
│                  VINCENT ABILITIES (Lit Actions)                │
│  1. ERC20 Approval (existing: @lit-protocol/...-erc20-approval)│
│  2. Options Create Profile (custom: create USDC liquidity)     │
│  3. Options Create Offer (custom: EIP-712 signed offer)        │
│  4. Options Take (custom: gasless take with EIP-3009)          │
│  5. Options Settle (custom: settle expired options)            │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 │ Lit Protocol Network (distributed signing)
                 ▼
┌────────────────────────────────────────────────────────────────┐
│              USER'S AGENT WALLET (PKP)                          │
│  • Holds USDC for liquidity & premiums                         │
│  • Signs transactions via Lit Protocol                          │
│  • Executes on-chain via OptionsProtocol.sol                   │
│  • Non-custodial (user owns PKP NFT)                           │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 │ Blockchain Transactions
                 ▼
┌────────────────────────────────────────────────────────────────┐
│              SMART CONTRACTS (Solidity)                         │
│  • OptionsProtocol.sol (with Vincent-friendly entry points)    │
│  • Liquidity Profiles (USDC-only)                              │
│  • Option NFTs (ERC-721)                                       │
│  • Settlement via Pyth/Uniswap oracles                         │
└────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Vincent App Setup (1-2 days)

### 1.1 Register Vincent App

**Tasks:**
- [ ] Go to https://dashboard.heyvincent.ai/
- [ ] Create new app: "Volvi Options Protocol"
- [ ] Configure app metadata:
  - Name: "Volvi Options"
  - Description: "USDC-only options protocol with automated liquidity"
  - App User URL: TBD (will be frontend URL)
  - Redirect URIs: TBD (OAuth callback URLs)
- [ ] Generate delegatee keys (app's signing key for Lit Protocol)
- [ ] Save App ID and delegatee private key securely

**Outputs:**
- `VINCENT_APP_ID`: Your unique app identifier
- `DELEGATEE_PRIVATE_KEY`: App's signing key (keep secure!)

### 1.2 Project Structure Setup

Create monorepo structure similar to vincent-starter-app:

```
volvi/
├── packages/
│   ├── options-frontend/        # React app
│   │   ├── src/
│   │   │   ├── components/      # UI components
│   │   │   ├── hooks/           # useBackend, useVincent
│   │   │   ├── pages/           # Login, Dashboard, Portfolio
│   │   │   └── config/          # Environment & Vincent config
│   │   └── package.json
│   │
│   ├── options-backend/         # Express API + worker
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   ├── express/     # Routes, middleware
│   │   │   │   ├── abilities/   # Vincent ability clients
│   │   │   │   └── db/          # MongoDB/PostgreSQL
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── options-abilities/       # Custom Vincent abilities
│       ├── src/
│       │   ├── create-profile/  # Liquidity profile ability
│       │   ├── create-offer/    # Offer creation ability
│       │   ├── take-option/     # Take option ability
│       │   └── settle-option/   # Settlement ability
│       └── package.json
│
├── src/                         # Existing Solidity contracts
├── docs/                        # Documentation
├── package.json                 # Root package.json (pnpm workspace)
└── pnpm-workspace.yaml         # Monorepo config
```

**Tasks:**
- [ ] Create monorepo structure with pnpm workspaces
- [ ] Set up TypeScript configs for all packages
- [ ] Create `.env.example` files with Vincent variables
- [ ] Set up build scripts

---

## Phase 2: Custom Vincent Abilities (4-7 days)

Vincent abilities are JavaScript functions published to IPFS that execute as Lit Actions. They define what operations users can delegate.

### 2.1 Ability 1: ERC20 Approval (Use Existing)

**Purpose:** Approve USDC spending by OptionsProtocol contract

**Implementation:**
- Use existing `@lit-protocol/vincent-ability-erc20-approval`
- No custom code needed

**Parameters:**
```typescript
{
  chainId: number;
  rpcUrl: string;
  tokenAddress: string;      // USDC address
  spenderAddress: string;     // OptionsProtocol address
  tokenAmount: string;        // Amount to approve
}
```

### 2.2 Ability 2: Create Liquidity Profile

**Purpose:** Create a USDC liquidity profile for writing options

**Lit Action Code:**
```javascript
// packages/options-abilities/src/create-profile/litAction.ts

(async () => {
  const {
    contractAddress,     // OptionsProtocol address
    totalUSDC,          // Amount to deposit
    maxLockDays,        // Maximum option duration
    minUnit,            // Minimum fill size (scaled by decimals)
    minPremium,         // Minimum premium (USDC units)
    chainId,
    rpcUrl,
  } = Lit.Actions.getParams();

  // Call contract's createLiquidityProfile function
  const txn = await Lit.Actions.callContract({
    chain: chainId === 8453 ? 'base' : 'baseSepolia',
    txn: {
      to: contractAddress,
      data: ethers.utils.defaultAbiCoder.encodeFunctionCall(
        'createLiquidityProfile',
        [totalUSDC, maxLockDays, minUnit, minPremium]
      ),
      value: '0',
    },
  });

  Lit.Actions.setResponse({
    response: JSON.stringify({
      txHash: txn.hash,
      success: true
    })
  });
})();
```

**Parameters Schema:**
```typescript
import { z } from 'zod';

export const createProfileParamsSchema = z.object({
  contractAddress: z.string(),
  totalUSDC: z.string(),
  maxLockDays: z.number().min(1).max(365),
  minUnit: z.string(),
  minPremium: z.string(),
  chainId: z.number(),
  rpcUrl: z.string(),
});
```

**Precheck Function:**
```typescript
export async function precheckCreateProfile(params, context) {
  const { delegatorPkpEthAddress } = context;

  // Check USDC balance
  const usdcBalance = await checkERC20Balance(
    params.rpcUrl,
    params.usdcAddress,
    delegatorPkpEthAddress
  );

  if (BigInt(usdcBalance) < BigInt(params.totalUSDC)) {
    return {
      success: false,
      error: `Insufficient USDC balance. Have: ${usdcBalance}, Need: ${params.totalUSDC}`
    };
  }

  // Check USDC approval
  const allowance = await checkERC20Allowance(
    params.rpcUrl,
    params.usdcAddress,
    delegatorPkpEthAddress,
    params.contractAddress
  );

  if (BigInt(allowance) < BigInt(params.totalUSDC)) {
    return {
      success: false,
      error: `Insufficient USDC allowance. Please approve USDC spending first.`
    };
  }

  return { success: true };
}
```

**Supported Policies:**
- Spending Limit (limit total USDC deposited)
- Time Lock (prevent withdrawals for X days)

### 2.3 Ability 3: Create Offer

**Purpose:** Create an EIP-712 signed offer to write options

**Lit Action Code:**
```javascript
(async () => {
  const {
    contractAddress,
    profileId,
    underlying,
    collateralAmount,
    stablecoin,
    isCall,
    premiumPerDay,
    minDuration,
    maxDuration,
    minFillAmount,
    deadline,
    configHash,
    chainId,
  } = Lit.Actions.getParams();

  // EIP-712 domain
  const domain = {
    name: 'OptionsProtocol',
    version: '1',
    chainId: chainId,
    verifyingContract: contractAddress,
  };

  // EIP-712 types
  const types = {
    OptionOffer: [
      { name: 'writer', type: 'address' },
      { name: 'profileId', type: 'bytes32' },
      { name: 'underlying', type: 'address' },
      { name: 'collateralAmount', type: 'uint256' },
      { name: 'stablecoin', type: 'address' },
      { name: 'isCall', type: 'bool' },
      { name: 'premiumPerDay', type: 'uint256' },
      { name: 'minDuration', type: 'uint16' },
      { name: 'maxDuration', type: 'uint16' },
      { name: 'minFillAmount', type: 'uint256' },
      { name: 'deadline', type: 'uint64' },
      { name: 'configHash', type: 'bytes32' },
    ],
  };

  const value = {
    writer: pkpAddress,
    profileId,
    underlying,
    collateralAmount,
    stablecoin,
    isCall,
    premiumPerDay,
    minDuration,
    maxDuration,
    minFillAmount,
    deadline,
    configHash,
  };

  // Sign EIP-712 message
  const signature = await Lit.Actions.signEip712({
    domain,
    types,
    value,
  });

  Lit.Actions.setResponse({
    response: JSON.stringify({
      signature: signature.signature,
      offer: value,
      success: true
    })
  });
})();
```

**Policies:**
- Token Whitelist (only allow certain tokens)
- Premium Floor (minimum premium per day)
- Duration Limits (max option duration)

### 2.4 Ability 4: Take Option (Gasless)

**Purpose:** Take an option using EIP-3009 gasless USDC payment

**Lit Action Code:**
```javascript
(async () => {
  const {
    contractAddress,
    offer,
    offerSignature,
    fillAmount,
    duration,
    premiumAuthParams,  // EIP-3009 params for premium
    chainId,
    rpcUrl,
  } = Lit.Actions.getParams();

  // Call takeOptionGasless with EIP-3009 authorization
  const txn = await Lit.Actions.callContract({
    chain: chainId === 8453 ? 'base' : 'baseSepolia',
    txn: {
      to: contractAddress,
      data: encodeFunctionCall(
        'takeOptionGasless',
        [offer, offerSignature, fillAmount, duration, premiumAuthParams]
      ),
      value: '0',
    },
  });

  Lit.Actions.setResponse({
    response: JSON.stringify({
      txHash: txn.hash,
      tokenId: extractTokenIdFromLogs(txn.logs),
      success: true
    })
  });
})();
```

**Precheck:**
- Verify USDC balance covers premium + gas fee
- Check offer not expired
- Verify fill amount within bounds
- Check profile coverage (if applicable)

**Policies:**
- Spending Limit per day/week/month
- Exposure Limit (max open positions)

### 2.5 Ability 5: Settle Option

**Purpose:** Settle an expired option

**Lit Action Code:**
```javascript
(async () => {
  const {
    contractAddress,
    tokenId,
    chainId,
  } = Lit.Actions.getParams();

  // Call settleOption
  const txn = await Lit.Actions.callContract({
    chain: chainId === 8453 ? 'base' : 'baseSepolia',
    txn: {
      to: contractAddress,
      data: encodeFunctionCall('settleOption', [tokenId]),
      value: '0',
    },
  });

  Lit.Actions.setResponse({
    response: JSON.stringify({
      txHash: txn.hash,
      success: true
    })
  });
})();
```

**Precheck:**
- Verify option is expired
- Check option not already settled
- Verify caller is NFT owner (or anyone if expired)

**Tasks for Phase 2:**
- [ ] Create `packages/options-abilities` package
- [ ] Implement Lit Action code for each ability
- [ ] Write parameter schemas (Zod)
- [ ] Implement precheck functions
- [ ] Define supported policies
- [ ] Write unit tests for abilities
- [ ] Publish Lit Actions to IPFS
- [ ] Register abilities in Vincent Dashboard
- [ ] Create bundled ability packages for backend use

---

## Phase 3: Backend Implementation (4-6 days)

### 3.1 Express Server Setup

**File:** `packages/options-backend/src/index.ts`

```typescript
import express from 'express';
import { registerRoutes } from './lib/express';
import { connectDatabase } from './lib/db/mongoose';
import { serviceLogger } from './lib/logger';

const app = express();
const PORT = process.env.PORT || 3001;

async function startServer() {
  // Connect to database
  await connectDatabase();

  // Register routes
  registerRoutes(app);

  app.listen(PORT, () => {
    serviceLogger.info(`Options backend listening on port ${PORT}`);
  });
}

startServer();
```

### 3.2 Vincent Auth Middleware

**File:** `packages/options-backend/src/lib/express/index.ts`

```typescript
import { createVincentUserMiddleware } from '@lit-protocol/vincent-app-sdk/expressMiddleware';
import { getAppInfo, getPKPInfo } from '@lit-protocol/vincent-app-sdk/jwt';

const { VINCENT_APP_ID, ALLOWED_AUDIENCE } = process.env;

const { handler, middleware } = createVincentUserMiddleware({
  userKey: 'user',
  allowedAudience: ALLOWED_AUDIENCE,
  requiredAppId: VINCENT_APP_ID,
});

export const registerRoutes = (app: Express) => {
  app.use(helmet());
  app.use(express.json());
  app.use(cors());

  // Protected routes
  app.get('/profiles', middleware, handler(handleGetProfilesRoute));
  app.post('/profile', middleware, handler(handleCreateProfileRoute));
  app.get('/orderbook', middleware, handler(handleGetOrderbookRoute));
  app.post('/offer', middleware, handler(handleCreateOfferRoute));
  app.post('/take', middleware, handler(handleTakeOptionRoute));
  app.get('/positions', middleware, handler(handleGetPositionsRoute));
  app.post('/settle', middleware, handler(handleSettleRoute));
};
```

### 3.3 Ability Clients

**File:** `packages/options-backend/src/lib/abilities/clients.ts`

```typescript
import { getVincentAbilityClient } from '@lit-protocol/vincent-app-sdk/abilityClient';
import { bundledVincentAbility as erc20ApprovalAbility } from '@lit-protocol/vincent-ability-erc20-approval';
import { bundledVincentAbility as createProfileAbility } from '@volvi/vincent-ability-create-profile';
import { bundledVincentAbility as createOfferAbility } from '@volvi/vincent-ability-create-offer';
import { bundledVincentAbility as takeOptionAbility } from '@volvi/vincent-ability-take-option';
import { bundledVincentAbility as settleOptionAbility } from '@volvi/vincent-ability-settle-option';
import { delegateeSigner } from './signer';

export function getErc20ApprovalClient() {
  return getVincentAbilityClient({
    bundledVincentAbility: erc20ApprovalAbility,
    ethersSigner: delegateeSigner,
  });
}

export function getCreateProfileClient() {
  return getVincentAbilityClient({
    bundledVincentAbility: createProfileAbility,
    ethersSigner: delegateeSigner,
  });
}

export function getCreateOfferClient() {
  return getVincentAbilityClient({
    bundledVincentAbility: createOfferAbility,
    ethersSigner: delegateeSigner,
  });
}

export function getTakeOptionClient() {
  return getVincentAbilityClient({
    bundledVincentAbility: takeOptionAbility,
    ethersSigner: delegateeSigner,
  });
}

export function getSettleOptionClient() {
  return getVincentAbilityClient({
    bundledVincentAbility: settleOptionAbility,
    ethersSigner: delegateeSigner,
  });
}
```

### 3.4 Route Handlers

**File:** `packages/options-backend/src/lib/express/profiles.ts`

```typescript
import { getPKPInfo } from '@lit-protocol/vincent-app-sdk/jwt';
import { getCreateProfileClient } from '../abilities/clients';
import { VincentAuthenticatedRequest } from './types';

export async function handleCreateProfileRoute(
  req: VincentAuthenticatedRequest,
  res: Response
) {
  const { totalUSDC, maxLockDays, minUnit, minPremium } = req.body;
  const pkpInfo = getPKPInfo(req.user.decodedJWT);

  const profileClient = getCreateProfileClient();

  // Precheck
  const precheckResult = await profileClient.precheck(
    {
      contractAddress: process.env.OPTIONS_PROTOCOL_ADDRESS,
      totalUSDC,
      maxLockDays,
      minUnit,
      minPremium,
      chainId: Number(process.env.CHAIN_ID),
      rpcUrl: process.env.RPC_URL,
    },
    { delegatorPkpEthAddress: pkpInfo.ethAddress }
  );

  if (!precheckResult.success) {
    return res.status(400).json({
      success: false,
      error: precheckResult.error
    });
  }

  // Execute
  const result = await profileClient.execute(
    {
      contractAddress: process.env.OPTIONS_PROTOCOL_ADDRESS,
      totalUSDC,
      maxLockDays,
      minUnit,
      minPremium,
      chainId: Number(process.env.CHAIN_ID),
      rpcUrl: process.env.RPC_URL,
    },
    { delegatorPkpEthAddress: pkpInfo.ethAddress }
  );

  if (!result.success) {
    return res.status(500).json({ success: false, error: result.error });
  }

  // Store in database
  await saveProfile({
    pkpAddress: pkpInfo.ethAddress,
    profileId: result.result.profileId,
    txHash: result.result.txHash,
    ...req.body,
  });

  res.json({ success: true, data: result.result });
}
```

**Tasks:**
- [ ] Set up Express server with Vincent middleware
- [ ] Create ability client factory functions
- [ ] Implement route handlers for:
  - [ ] Profile creation
  - [ ] Offer creation
  - [ ] Taking options
  - [ ] Settling options
  - [ ] Orderbook queries
  - [ ] Position queries
- [ ] Add error handling and logging
- [ ] Set up database models (MongoDB/PostgreSQL)
- [ ] Write integration tests

---

## Phase 4: Frontend Implementation (5-8 days)

### 4.1 Vincent Auth Setup

**File:** `packages/options-frontend/src/config/vincent.ts`

```typescript
import { createConfig } from '@lit-protocol/vincent-app-sdk/react';

export const vincentConfig = createConfig({
  appId: import.meta.env.VITE_VINCENT_APP_ID,
  redirectUri: import.meta.env.VITE_REDIRECT_URI,
});
```

**File:** `packages/options-frontend/src/App.tsx`

```typescript
import { VincentProvider } from '@lit-protocol/vincent-app-sdk/react';
import { vincentConfig } from './config/vincent';

function App() {
  return (
    <VincentProvider config={vincentConfig}>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
        </Routes>
      </Router>
    </VincentProvider>
  );
}
```

### 4.2 Login Flow

**File:** `packages/options-frontend/src/pages/LoginPage.tsx`

```typescript
import { useVincentWebAuthClient } from '@lit-protocol/vincent-app-sdk/react';

export function LoginPage() {
  const vincentWebAuthClient = useVincentWebAuthClient(
    import.meta.env.VITE_VINCENT_APP_ID
  );

  const handleConnect = () => {
    vincentWebAuthClient.redirectToConnectPage({
      redirectUri: window.location.origin + '/dashboard',
    });
  };

  return (
    <div>
      <h1>Volvi Options Protocol</h1>
      <p>USDC-only options with automated liquidity</p>
      <button onClick={handleConnect}>
        Connect with Vincent
      </button>
    </div>
  );
}
```

### 4.3 Backend API Hook

**File:** `packages/options-frontend/src/hooks/useBackend.ts`

```typescript
import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';

export const useBackend = () => {
  const { authInfo } = useJwtContext();

  const sendRequest = async (endpoint: string, method: string, body?: unknown) => {
    if (!authInfo?.jwt) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${authInfo.jwt}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    return response.json();
  };

  return {
    createProfile: (params) => sendRequest('/profile', 'POST', params),
    createOffer: (params) => sendRequest('/offer', 'POST', params),
    takeOption: (params) => sendRequest('/take', 'POST', params),
    getPositions: () => sendRequest('/positions', 'GET'),
    settleOption: (tokenId) => sendRequest('/settle', 'POST', { tokenId }),
  };
};
```

### 4.4 UI Components

**Create Profile Component:**
```typescript
export function CreateProfileForm() {
  const { createProfile } = useBackend();
  const [totalUSDC, setTotalUSDC] = useState('');
  const [maxLockDays, setMaxLockDays] = useState(30);

  const handleSubmit = async () => {
    const result = await createProfile({
      totalUSDC: parseUnits(totalUSDC, 6).toString(),
      maxLockDays,
      minUnit: parseUnits('0.001', 18).toString(),
      minPremium: parseUnits('0.01', 6).toString(),
    });

    // Show success message
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="number"
        value={totalUSDC}
        onChange={(e) => setTotalUSDC(e.target.value)}
        placeholder="USDC Amount"
      />
      <input
        type="number"
        value={maxLockDays}
        onChange={(e) => setMaxLockDays(Number(e.target.value))}
        placeholder="Max Lock Days"
      />
      <button type="submit">Create Profile</button>
    </form>
  );
}
```

**Tasks:**
- [ ] Set up Vincent provider and auth
- [ ] Implement login/connect flow
- [ ] Create useBackend hook for API calls
- [ ] Build UI components:
  - [ ] Create Profile form
  - [ ] Create Offer form (with token selector)
  - [ ] Take Option form (orderbook + take UI)
  - [ ] Position cards
  - [ ] Settlement dialog
- [ ] Add loading states and error handling
- [ ] Implement real-time updates (React Query)
- [ ] Style with Tailwind CSS

---

## Phase 5: Smart Contract Updates (2-3 days)

### 5.1 Vincent-Friendly Modifications

The existing contracts are already well-designed, but we may need some minor updates:

**Considerations:**
1. **Gas Estimation**: Ensure functions return gas estimates for frontend display
2. **Events**: Comprehensive events for indexing/tracking
3. **View Functions**: Add helpers for checking balances, allowances, profile coverage
4. **Batch Operations**: Consider adding batch functions if needed

**Potential Additions:**

```solidity
// Helper function for Vincent frontend
function getProfileAllocations(bytes32 profileId, address[] calldata tokens)
    external
    view
    returns (uint16[] memory allocations)
{
    allocations = new uint16[](tokens.length);
    for (uint i = 0; i < tokens.length; i++) {
        allocations[i] = profileAllocationsBps[profileId][tokens[i]];
    }
}

// Check if user can create profile
function canCreateProfile(address user, uint256 totalUSDC)
    external
    view
    returns (bool can, string memory reason)
{
    // Check USDC balance
    if (IERC20(defaultStablecoin).balanceOf(user) < totalUSDC) {
        return (false, "Insufficient USDC balance");
    }

    // Check USDC approval
    if (IERC20(defaultStablecoin).allowance(user, address(this)) < totalUSDC) {
        return (false, "Insufficient USDC approval");
    }

    return (true, "");
}
```

**Tasks:**
- [ ] Review existing contracts for Vincent compatibility
- [ ] Add helper view functions if needed
- [ ] Ensure comprehensive event emissions
- [ ] Update tests to cover new functions
- [ ] Deploy updated contracts to testnet
- [ ] Update ABI files in frontend/backend

---

## Phase 6: Testing & Integration (3-5 days)

### 6.1 Unit Tests

- [ ] Test each Vincent ability in isolation
- [ ] Test precheck functions
- [ ] Test backend route handlers
- [ ] Test frontend components

### 6.2 Integration Tests

- [ ] End-to-end flow: Connect → Create Profile → Create Offer → Take Option → Settle
- [ ] Test with multiple users
- [ ] Test error scenarios (insufficient funds, expired offers, etc.)
- [ ] Test permission revocation

### 6.3 Vincent Dashboard Testing

- [ ] Verify abilities are registered correctly
- [ ] Test user consent flow
- [ ] Verify policies work as expected
- [ ] Test version management

---

## Phase 7: Deployment (2-3 days)

### 7.1 Deploy Abilities

- [ ] Publish Lit Actions to IPFS
- [ ] Register abilities in Vincent Dashboard
- [ ] Attach abilities to Vincent App
- [ ] Test ability execution on testnet

### 7.2 Deploy Backend

**Railway/Heroku Deployment:**
- [ ] Set up MongoDB/PostgreSQL
- [ ] Configure environment variables:
  ```
  VINCENT_APP_ID=...
  DELEGATEE_PRIVATE_KEY=...
  ALLOWED_AUDIENCE=...
  OPTIONS_PROTOCOL_ADDRESS=...
  CHAIN_ID=8453
  RPC_URL=...
  DATABASE_URL=...
  ```
- [ ] Deploy backend service
- [ ] Test API endpoints

### 7.3 Deploy Frontend

**Vercel/Netlify Deployment:**
- [ ] Configure environment variables:
  ```
  VITE_VINCENT_APP_ID=...
  VITE_REDIRECT_URI=...
  VITE_BACKEND_URL=...
  ```
- [ ] Deploy frontend
- [ ] Update Vincent App URLs in dashboard
- [ ] Test full user flow

---

## Key Advantages of Vincent Integration

1. **Gasless UX**: Users only need USDC, no ETH required
2. **Non-Custodial**: Users own their Agent Wallet (PKP NFT)
3. **Automated**: Your app can execute on behalf of users (settle expired options, rebalance, etc.)
4. **Granular Permissions**: Users delegate specific actions, not full wallet access
5. **Revocable**: Users can revoke access anytime
6. **Multi-Auth**: Vincent supports wallet, email, social, passkeys
7. **Policy Enforcement**: Spending limits, contract whitelists, time locks
8. **Auditable**: All delegations on-chain

---

## Timeline Summary

| Phase | Duration | Description |
|-------|----------|-------------|
| 1. Vincent App Setup | 1-2 days | Register app, create structure |
| 2. Custom Abilities | 4-7 days | Build Lit Actions |
| 3. Backend | 4-6 days | Express API with Vincent auth |
| 4. Frontend | 5-8 days | React app with Vincent SDK |
| 5. Contract Updates | 2-3 days | Minor improvements |
| 6. Testing | 3-5 days | Integration testing |
| 7. Deployment | 2-3 days | Deploy to production |
| **Total** | **21-34 days** | **~3-5 weeks** |

---

## Next Steps

1. **Immediate**: Register Vincent App and get App ID
2. **This week**: Set up project structure and create first ability (Create Profile)
3. **Next week**: Build backend with Vincent auth
4. **Following weeks**: Complete frontend and testing

---

## Resources

- **Vincent Docs**: https://docs.heyvincent.ai/
- **Vincent Dashboard**: https://dashboard.heyvincent.ai/
- **DCA Example**: In `/docs/vincent-starter-app/`
- **Lit Protocol**: https://developer.litprotocol.com/
- **Existing Contracts**: `/src/OptionsProtocol.sol`, `/src/OptionsProtocolGasless.sol`

---

**Status**: Ready to begin Phase 1 ✅
