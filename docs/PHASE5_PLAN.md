# Phase 5 Plan: Ability Publishing & Production Deployment

**Status**: 🚧 In Planning
**Prerequisites**: Phases 1-4 Complete ✅

## Overview

Phase 5 is the final phase of the Vincent integration, focusing on publishing abilities to IPFS, registering them in the Vincent Dashboard, deploying smart contracts, and preparing for production deployment.

## Goals

1. ✅ Publish all Lit Actions to IPFS
2. ✅ Register abilities in Vincent Dashboard
3. ✅ Deploy smart contracts to Base Sepolia (testnet)
4. ✅ Complete end-to-end testing
5. ✅ Production deployment setup

## Phase 5 Breakdown

### Step 1: Smart Contract Deployment

**Goal**: Deploy contracts to Base Sepolia testnet

#### Tasks:

1. **Prepare Deployment**
   - Review contract code in `src/`
   - Update deployment scripts in `script/`
   - Set up environment variables

2. **Deploy to Base Sepolia**
   ```bash
   # Set environment variables
   export PRIVATE_KEY=0x...
   export BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
   export ETHERSCAN_API_KEY=...

   # Deploy
   cd src
   forge script script/DeployBaseSepolia.s.sol \
     --rpc-url $BASE_SEPOLIA_RPC_URL \
     --broadcast \
     --verify
   ```

3. **Note Contract Addresses**
   - OptionsProtocol address
   - OptionsProtocolGasless address
   - USDC address (Base Sepolia testnet)

4. **Update Environment Variables**
   - Update `packages/backend/.env`
   - Update `packages/frontend/.env`
   - Set `OPTIONS_PROTOCOL_ADDRESS`

**Deliverables**:
- ✅ Contracts deployed to Base Sepolia
- ✅ Contracts verified on BaseScan
- ✅ Contract addresses documented

---

### Step 2: Publish Abilities to IPFS

**Goal**: Upload Lit Action code to IPFS and get CIDs

#### Tasks:

1. **Build Abilities**
   ```bash
   pnpm --filter @volvi/abilities build
   ```

2. **Publish to IPFS**

   Each ability's Lit Action needs to be uploaded to IPFS. The Lit Action code is bundled JavaScript that runs in the Lit Protocol's trusted execution environment.

   **Option A: Manual IPFS Upload**
   ```bash
   # Install IPFS CLI if needed
   # brew install ipfs (macOS)
   # or download from https://ipfs.io/

   # For each ability:
   ipfs add packages/abilities/dist/create-profile/litAction.js
   ipfs add packages/abilities/dist/create-offer/litAction.js
   ipfs add packages/abilities/dist/take-option/litAction.js
   ipfs add packages/abilities/dist/settle-option/litAction.js
   ```

   **Option B: Use Pinata or NFT.Storage**
   - Upload to [Pinata](https://pinata.cloud/) or [NFT.Storage](https://nft.storage/)
   - Get IPFS CIDs for each Lit Action

3. **Document CIDs**

   Create a file to track all CIDs:

   ```json
   {
     "createProfile": "ipfs://Qm...",
     "createOffer": "ipfs://Qm...",
     "takeOption": "ipfs://Qm...",
     "settleOption": "ipfs://Qm..."
   }
   ```

**Deliverables**:
- ✅ All Lit Actions published to IPFS
- ✅ CIDs documented
- ✅ Files pinned (won't be garbage collected)

---

### Step 3: Register Vincent App

**Goal**: Create production Vincent App and register all abilities

#### Tasks:

1. **Create Vincent App**
   - Go to [Vincent Dashboard](https://dashboard.heyvincent.ai/)
   - Click "Create New App"
   - Fill in details:
     - **Name**: Volvi Options Protocol
     - **Description**: USDC-only options protocol with gasless trading
     - **App User URL**: Your frontend URL (e.g., `https://volvi.app`)
     - **Redirect URIs**: Your callback URL (e.g., `https://volvi.app/callback`)
   - Generate delegatee keys
   - **IMPORTANT**: Save the delegatee private key securely
   - Copy your App ID

2. **Register Abilities**

   For each ability, register in the Vincent Dashboard:

   **Create Profile Ability**
   - Name: Create Liquidity Profile
   - Description: Create a USDC liquidity profile for writing options
   - Lit Action CID: `ipfs://Qm...` (from Step 2)
   - Parameters: Use schema from `packages/abilities/src/create-profile/schema.ts`
   - Policies: Spending limit, time lock

   **Create Offer Ability**
   - Name: Create Option Offer
   - Description: Create a signed option offer for the orderbook
   - Lit Action CID: `ipfs://Qm...`
   - Parameters: Use schema from `packages/abilities/src/create-offer/schema.ts`
   - Policies: Token whitelist, premium floor, duration limits

   **Take Option Ability**
   - Name: Take Option
   - Description: Take an option gaslessly with USDC payment
   - Lit Action CID: `ipfs://Qm...`
   - Parameters: Use schema from `packages/abilities/src/take-option/schema.ts`
   - Policies: Spending limit, exposure limit, token whitelist

   **Settle Option Ability**
   - Name: Settle Option
   - Description: Settle an expired option and claim profits
   - Lit Action CID: `ipfs://Qm...`
   - Parameters: Use schema from `packages/abilities/src/settle-option/schema.ts`
   - Policies: Auto-settle

3. **Add ERC20 Approval Ability**
   - This is a built-in Vincent ability
   - Add to your app for USDC approvals
   - Required before creating profiles

4. **Test Ability Registration**
   - Try connecting with a test PKP
   - Verify abilities appear in user approval flow
   - Check that parameters are correct

**Deliverables**:
- ✅ Vincent App created
- ✅ All 4 custom abilities registered
- ✅ ERC20 Approval ability added
- ✅ App ID and delegatee key saved securely

---

### Step 4: Update Application Configuration

**Goal**: Update all environment variables with production values

#### Tasks:

1. **Update Backend Environment**

   Edit `packages/backend/.env`:
   ```bash
   # Vincent Configuration
   VINCENT_APP_ID=your_production_app_id
   DELEGATEE_PRIVATE_KEY=0x...  # From Step 3
   ALLOWED_AUDIENCE=https://volvi.app

   # Network Configuration
   CHAIN_ID=84532  # Base Sepolia
   RPC_URL=https://sepolia.base.org
   OPTIONS_PROTOCOL_ADDRESS=0x...  # From Step 1

   # Database
   MONGODB_URI=mongodb://...  # Production MongoDB
   USE_MONGODB=true

   # Server
   PORT=3001
   NODE_ENV=production
   CORS_ALLOWED_DOMAIN=https://volvi.app

   # Logging
   LOG_LEVEL=info
   ```

2. **Update Frontend Environment**

   Edit `packages/frontend/.env`:
   ```bash
   # Vincent Configuration
   VITE_VINCENT_APP_ID=your_production_app_id
   VITE_REDIRECT_URI=https://volvi.app/callback

   # Backend API
   VITE_BACKEND_URL=https://api.volvi.app

   # Network
   VITE_CHAIN_ID=84532
   VITE_RPC_URL=https://sepolia.base.org
   VITE_OPTIONS_PROTOCOL_ADDRESS=0x...  # From Step 1

   # Environment
   VITE_ENV=production
   ```

3. **Update Ability Clients** (if needed)

   If Vincent SDK requires explicit CIDs in ability clients, update:
   `packages/backend/src/lib/abilities/clients.ts`

**Deliverables**:
- ✅ Backend environment configured
- ✅ Frontend environment configured
- ✅ All contract addresses updated
- ✅ Vincent App ID set

---

### Step 5: End-to-End Testing

**Goal**: Test complete user flow on testnet

#### Test Cases:

1. **User Authentication**
   - [ ] User connects with email
   - [ ] User connects with wallet
   - [ ] User connects with social login
   - [ ] PKP (Agent Wallet) is created
   - [ ] JWT authentication works

2. **Create Profile Flow**
   - [ ] User approves USDC spending
   - [ ] User creates profile with USDC deposit
   - [ ] Transaction succeeds on Base Sepolia
   - [ ] Profile appears in database
   - [ ] Transaction logged

3. **Create Offer Flow**
   - [ ] User fills offer creation form
   - [ ] Offer is signed with PKP (EIP-712)
   - [ ] Offer appears in orderbook
   - [ ] Offer stored in database with signature

4. **Take Option Flow**
   - [ ] Taker browses orderbook
   - [ ] Taker selects offer and duration
   - [ ] Premium calculated correctly
   - [ ] EIP-3009 payment authorization works
   - [ ] Transaction succeeds (gasless)
   - [ ] Position created and appears in My Positions
   - [ ] Offer filled amount updated in database

5. **Settle Option Flow**
   - [ ] Wait for option to expire (or mock expiry)
   - [ ] User clicks settle on expired position
   - [ ] Settlement transaction succeeds
   - [ ] Position marked as settled in database
   - [ ] Profit distributed correctly

6. **Database Persistence**
   - [ ] All data persists across refreshes
   - [ ] Queries return correct results
   - [ ] Auto-refresh works for orderbook
   - [ ] Auto-refresh works for positions

7. **Error Handling**
   - [ ] Graceful handling of failed transactions
   - [ ] User-friendly error messages
   - [ ] Retry mechanisms work
   - [ ] Database errors don't crash server

**Testing Tools**:
- Base Sepolia testnet faucet for test USDC
- Multiple test accounts for taker/writer scenarios
- Browser DevTools for debugging
- MongoDB Compass for database inspection

**Deliverables**:
- ✅ All test cases passing
- ✅ Bug fixes implemented
- ✅ User flow documented

---

### Step 6: Production Deployment

**Goal**: Deploy backend and frontend to production

#### Backend Deployment (Railway/Heroku/Render)

1. **Choose Platform**
   - Railway (recommended for Node.js)
   - Heroku
   - Render
   - DigitalOcean App Platform

2. **Deploy Backend**
   ```bash
   # Railway example
   railway login
   railway init
   railway up

   # Set environment variables in Railway dashboard
   # All variables from packages/backend/.env
   ```

3. **Configure Database**
   - Use MongoDB Atlas (cloud) or host your own
   - Set `MONGODB_URI` in production environment
   - Enable IP whitelist for security
   - Set up database backups

4. **Set Up Monitoring**
   - Enable logging (Pino JSON logs)
   - Set up error tracking (Sentry)
   - Monitor server health
   - Set up alerts

#### Frontend Deployment (Vercel/Netlify)

1. **Choose Platform**
   - Vercel (recommended for React)
   - Netlify
   - Cloudflare Pages

2. **Deploy Frontend**
   ```bash
   # Vercel example
   vercel login
   cd packages/frontend
   vercel --prod

   # Or connect GitHub repo for auto-deploy
   ```

3. **Configure Environment**
   - Set all `VITE_*` variables in Vercel dashboard
   - Update Vincent App redirect URIs
   - Configure custom domain

4. **Update DNS**
   - Point `volvi.app` to Vercel/Netlify
   - Point `api.volvi.app` to Railway/Heroku
   - Enable HTTPS (automatic on most platforms)

**Deliverables**:
- ✅ Backend deployed and accessible
- ✅ Frontend deployed and accessible
- ✅ Database running in production
- ✅ Environment variables set
- ✅ Custom domains configured
- ✅ HTTPS enabled

---

### Step 7: Documentation & Launch

**Goal**: Document everything and prepare for launch

#### Tasks:

1. **User Documentation**
   - Write user guide
   - Create tutorial videos
   - Document common issues / FAQ
   - Write blog post announcing launch

2. **Developer Documentation**
   - Update README with production URLs
   - Document API endpoints
   - Document ability parameters
   - Write integration guide for other developers

3. **Security Review**
   - Review smart contracts (consider audit)
   - Review Vincent ability code
   - Check environment variable security
   - Review database security (encryption, backups)
   - Test against common vulnerabilities

4. **Launch Checklist**
   - [ ] Smart contracts deployed and verified
   - [ ] All abilities registered in Vincent Dashboard
   - [ ] Backend deployed and tested
   - [ ] Frontend deployed and tested
   - [ ] Database configured with backups
   - [ ] Monitoring and alerts set up
   - [ ] User documentation complete
   - [ ] Social media accounts ready
   - [ ] Launch announcement prepared

**Deliverables**:
- ✅ Complete user documentation
- ✅ Complete developer documentation
- ✅ Security review completed
- ✅ Launch checklist complete

---

## Success Criteria

Phase 5 is complete when:

- [x] All smart contracts deployed to Base Sepolia
- [x] All Lit Actions published to IPFS with CIDs
- [x] Vincent App registered with all abilities
- [x] End-to-end user flow tested and working
- [x] Backend deployed to production
- [x] Frontend deployed to production
- [x] Database configured in production
- [x] Documentation complete
- [x] Ready for mainnet launch

## Estimated Timeline

- **Step 1** (Smart Contracts): 1-2 days
- **Step 2** (IPFS Publishing): 1 day
- **Step 3** (Vincent Registration): 1 day
- **Step 4** (Configuration): 1 day
- **Step 5** (Testing): 3-5 days
- **Step 6** (Deployment): 2-3 days
- **Step 7** (Documentation): 2-3 days

**Total**: 2-3 weeks

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Smart contract bugs | High | Thorough testing, consider audit |
| Vincent API changes | Medium | Pin SDK versions, monitor updates |
| Database performance | Medium | Index optimization, caching |
| Gas price volatility | Low | Use Base L2 (low fees) |
| User adoption | Medium | Good UX, documentation, tutorials |

## Post-Phase 5 (Mainnet Launch)

After Phase 5 is complete and testnet is working:

1. **Smart Contract Audit** (recommended)
2. **Deploy to Base Mainnet**
3. **Final Production Testing**
4. **Public Launch**
5. **Community Building**
6. **Iterative Improvements**

---

## Next Immediate Steps

To get started with Phase 5:

1. **Deploy Smart Contracts** to Base Sepolia
   ```bash
   cd src
   forge script script/DeployBaseSepolia.s.sol --rpc-url $RPC_URL --broadcast
   ```

2. **Build and Publish Abilities**
   ```bash
   pnpm --filter @volvi/abilities build
   # Then upload to IPFS
   ```

3. **Register Vincent App** at https://dashboard.heyvincent.ai/

4. **Update Environment Variables** with real values

5. **Start Testing** the complete flow

---

**Phase 5 Status**: Ready to Begin
**Dependencies**: All Phases 1-4 Complete ✅
**Blocker**: None - ready to proceed!
