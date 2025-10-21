# Vincent Dashboard Setup Guide

**Package Published:** `@parseb/volvi-abilities@1.0.0` ✅

**npm Registry:** https://www.npmjs.com/package/@parseb/volvi-abilities

---

## Next Steps: Register Abilities in Vincent Dashboard

Go to: **https://dashboard.heyvincent.ai/**

---

## 1. Create/Select Your Vincent App

If you haven't already:
1. Click "Create New App"
2. Give it a name (e.g., "Volvi Options Protocol")
3. Note your **APP_ID** - you'll need this for backend/frontend `.env` files

---

## 2. Register Each Ability

For each of the 4 abilities, click "Create New Ability" and use these exact values:

### Ability 1: Create Profile

| Field | Value |
|-------|-------|
| **Package Name** | `@parseb/volvi-abilities/create-profile@1.0.0` |
| **Title** | `create-profile` |
| **Description** | `Create USDC liquidity profiles for writing options` |
| **Active Version** | `1.0.0` |
| **Deployment Status** | `Development` |

**Parameters Schema:** See [packages/abilities/src/create-profile/schema.ts](packages/abilities/src/create-profile/schema.ts)

---

### Ability 2: Create Offer

| Field | Value |
|-------|-------|
| **Package Name** | `@parseb/volvi-abilities/create-offer@1.0.0` |
| **Title** | `create-offer` |
| **Description** | `Create signed option offers for orderbook using EIP-712` |
| **Active Version** | `1.0.0` |
| **Deployment Status** | `Development` |

**Parameters Schema:** See [packages/abilities/src/create-offer/schema.ts](packages/abilities/src/create-offer/schema.ts)

---

### Ability 3: Take Option

| Field | Value |
|-------|-------|
| **Package Name** | `@parseb/volvi-abilities/take-option@1.0.0` |
| **Title** | `take-option` |
| **Description** | `Take options gaslessly with EIP-3009 USDC payment authorization` |
| **Active Version** | `1.0.0` |
| **Deployment Status** | `Development` |

**Parameters Schema:** See [packages/abilities/src/take-option/schema.ts](packages/abilities/src/take-option/schema.ts)

---

### Ability 4: Settle Option

| Field | Value |
|-------|-------|
| **Package Name** | `@parseb/volvi-abilities/settle-option@1.0.0` |
| **Title** | `settle-option` |
| **Description** | `Settle expired options and claim profits` |
| **Active Version** | `1.0.0` |
| **Deployment Status** | `Development` |

**Parameters Schema:** See [packages/abilities/src/settle-option/schema.ts](packages/abilities/src/settle-option/schema.ts)

---

## 3. Get Ability IPFS CIDs

After registering each ability in Vincent Dashboard, the dashboard will:
1. Fetch your package from npm (`@parseb/volvi-abilities`)
2. Extract the specific subpath export (e.g., `/create-profile`)
3. Bundle and publish to IPFS
4. Provide you with an **IPFS CID** for each ability

**Save these CIDs!** You'll need them for your backend integration.

---

## 4. Update Backend Environment Variables

Once you have your APP_ID and ability CIDs, create `packages/backend/.env`:

```bash
# Vincent Configuration
VINCENT_APP_ID=your_app_id_from_dashboard
VINCENT_DELEGATEE_PRIVATE_KEY=your_delegatee_private_key

# Ability IPFS CIDs (from Vincent Dashboard after registration)
CREATE_PROFILE_ABILITY_CID=QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
CREATE_OFFER_ABILITY_CID=QmYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
TAKE_OPTION_ABILITY_CID=QmZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ
SETTLE_OPTION_ABILITY_CID=QmAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA

# Blockchain Configuration
CHAIN_ID=84532  # Base Sepolia (use 8453 for Base Mainnet)
RPC_URL=https://sepolia.base.org
OPTIONS_PROTOCOL_ADDRESS=0xD7AFfB2B3303e9Cb44C9d9aFA6bD938200b3C8F2

# USDC Token Address
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e  # Base Sepolia USDC

# Database (Optional)
USE_MONGODB=false
MONGODB_URI=mongodb://localhost:27017/volvi

# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ALLOWED_DOMAIN=http://localhost:5173

# Logging
LOG_LEVEL=info

# Optional: Alchemy Gas Sponsorship
ALCHEMY_API_KEY=your_alchemy_api_key
ALCHEMY_POLICY_ID=your_alchemy_policy_id
```

---

## 5. Update Frontend Environment Variables

Create `packages/frontend/.env`:

```bash
# Vincent Configuration
VITE_VINCENT_APP_ID=your_app_id_from_dashboard

# Backend API
VITE_API_URL=http://localhost:3001

# Blockchain Configuration
VITE_CHAIN_ID=84532  # Base Sepolia
VITE_RPC_URL=https://sepolia.base.org
VITE_OPTIONS_PROTOCOL_ADDRESS=0xD7AFfB2B3303e9Cb44C9d9aFA6bD938200b3C8F2
VITE_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

---

## 6. Test the Integration

### Start Backend:
```bash
cd packages/backend
pnpm dev
```

### Start Frontend:
```bash
cd packages/frontend
pnpm dev
```

### Test Flow:
1. Visit http://localhost:5173
2. Connect with Vincent (creates PKP wallet)
3. Try creating a profile
4. Check backend logs for ability execution

---

## 7. Important Notes

### Package Subpath Exports

The package is structured with **subpath exports**, meaning each ability is imported like:

```typescript
// In code:
import { createProfileAbility } from '@parseb/volvi-abilities/create-profile';
import { createOfferAbility } from '@parseb/volvi-abilities/create-offer';
import { takeOptionAbility } from '@parseb/volvi-abilities/take-option';
import { settleOptionAbility } from '@parseb/volvi-abilities/settle-option';
```

But in **Vincent Dashboard**, you register them as:
- `@parseb/volvi-abilities/create-profile@1.0.0`
- `@parseb/volvi-abilities/create-offer@1.0.0`
- `@parseb/volvi-abilities/take-option@1.0.0`
- `@parseb/volvi-abilities/settle-option@1.0.0`

### Updating Abilities

When you update ability code:

1. **Rebuild:**
   ```bash
   cd packages/abilities
   pnpm build
   ```

2. **Bump version** in `package.json`:
   ```json
   {
     "version": "1.0.1"
   }
   ```

3. **Republish to npm:**
   ```bash
   npm publish
   ```

4. **Update version in Vincent Dashboard** for each affected ability

### Deployment Status

- **Development**: For testing (current)
- **Production**: When ready for mainnet deployment

---

## 8. Troubleshooting

### Vincent Dashboard Can't Find Package

- Wait 2-3 minutes after publishing to npm (registry propagation)
- Verify package exists: https://www.npmjs.com/package/@parseb/volvi-abilities
- Check you're using exact package name with subpath

### Ability Registration Fails

- Ensure package version exists on npm
- Verify subpath exports are in package.json
- Check that built files exist in `dist/` directory

### Backend Can't Load Abilities

- Verify IPFS CIDs are correct in `.env`
- Check that APP_ID matches Vincent Dashboard
- Ensure DELEGATEE_PRIVATE_KEY is valid

---

## Success Checklist

- [ ] Package published to npm: `@parseb/volvi-abilities@1.0.0`
- [ ] Created Vincent App in Dashboard
- [ ] Registered all 4 abilities in Vincent Dashboard
- [ ] Saved IPFS CIDs from dashboard
- [ ] Created `packages/backend/.env` with all variables
- [ ] Created `packages/frontend/.env` with all variables
- [ ] Backend starts successfully (`pnpm dev`)
- [ ] Frontend starts successfully (`pnpm dev`)
- [ ] Can connect to Vincent in UI
- [ ] Can execute test ability

---

**You're Ready!** 🎉

Next step: Go to https://dashboard.heyvincent.ai/ and register your abilities!
