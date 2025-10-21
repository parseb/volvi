# Volvi Options Protocol - Deployment Guide

**Last Updated**: 2025-10-21
**Target Network**: Base Sepolia (Testnet)
**Status**: Ready for Deployment

## Overview

This guide walks you through deploying the Volvi Options Protocol from local development to production. Follow these steps in order to ensure a smooth deployment.

## Prerequisites

### Required Tools

```bash
# Foundry (for smart contracts)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Node.js >= 22.16.0
node --version

# pnpm >= 10.7.0
corepack enable
pnpm --version

# Git
git --version
```

### Required Accounts

1. **Vincent Dashboard Account**: https://dashboard.heyvincent.ai/
2. **Base Sepolia Testnet Funds**: Get test ETH from https://base.sepolia.etherscan.io/faucet
3. **MongoDB Instance**: Local or MongoDB Atlas (https://www.mongodb.com/cloud/atlas)
4. **Hosting Accounts** (for production):
   - Backend: Railway, Heroku, or Render
   - Frontend: Vercel or Netlify

## Phase 5 Deployment Steps

### Step 1: Smart Contract Deployment

#### 1.1 Prepare Deployment Environment

Create `.env` file in project root:

```bash
# Create .env in project root (for Foundry)
touch .env

# Add these variables:
DEPLOYER_PRIVATE_KEY=0x...  # Your private key with test ETH
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
ETHERSCAN_API_KEY=...  # Get from https://basescan.org/myapikey (optional, for verification)
```

**⚠️ Security**: Never commit this `.env` file. It's already in `.gitignore`.

#### 1.2 Get Test ETH

You need ~0.05 ETH on Base Sepolia for deployment:

```bash
# Check your deployer balance
cast balance <YOUR_ADDRESS> --rpc-url https://sepolia.base.org

# Get test ETH from faucet if needed:
# Visit: https://www.alchemy.com/faucets/base-sepolia
# Or: https://base.sepolia.etherscan.io/faucet
```

#### 1.3 Deploy OptionsProtocolGasless

We'll deploy the gasless version which supports all features:

```bash
# Create deployments directory
mkdir -p deployments

# Deploy to Base Sepolia
forge script script/DeployBaseSepoliaGasless.s.sol:DeployBaseSepoliaGaslessScript \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  -vvvv

# The contract address will be printed in the console
# It will also be saved to: deployments/base-sepolia-gasless.txt
```

#### 1.4 Verify Deployment

```bash
# Check deployment file
cat deployments/base-sepolia-gasless.txt

# Should show:
# BASE_SEPOLIA_PROTOCOL_GASLESS=0x...
# BASE_SEPOLIA_USDC=0x036CbD53842c5426634e7929541eC2318f3dCF7e
# etc.

# Verify contract is deployed
cast code <CONTRACT_ADDRESS> --rpc-url https://sepolia.base.org

# Should return bytecode (not empty)
```

#### 1.5 Save Contract Address

Copy the deployed contract address. You'll need it for:
- Backend `.env` → `OPTIONS_PROTOCOL_ADDRESS`
- Frontend `.env` → `VITE_OPTIONS_PROTOCOL_ADDRESS`

### Step 2: Publish Abilities to IPFS

#### 2.1 Build Abilities

```bash
# Build abilities package
pnpm --filter @volvi/abilities build

# Check output
ls -la packages/abilities/dist/

# Should see:
# create-profile/
# create-offer/
# take-option/
# settle-option/
```

#### 2.2 Publish Lit Actions to IPFS

You need to upload each ability's Lit Action code to IPFS.

**Option A: Using Pinata (Recommended)**

1. Sign up at https://pinata.cloud/ (free tier works)
2. Go to "Files" → "Upload"
3. Upload each Lit Action file:
   - `packages/abilities/dist/create-profile/litAction.js`
   - `packages/abilities/dist/create-offer/litAction.js`
   - `packages/abilities/dist/take-option/litAction.js`
   - `packages/abilities/dist/settle-option/litAction.js`
4. Copy the IPFS CID for each file (e.g., `Qm...`)

**Option B: Using NFT.Storage**

1. Sign up at https://nft.storage/ (free)
2. Get API key
3. Use their web interface or CLI to upload files

**Option C: Local IPFS Node**

```bash
# Install IPFS
# macOS: brew install ipfs
# Linux: See https://docs.ipfs.io/install/

# Initialize and start daemon
ipfs init
ipfs daemon &

# Upload each file
ipfs add packages/abilities/dist/create-profile/litAction.js
ipfs add packages/abilities/dist/create-offer/litAction.js
ipfs add packages/abilities/dist/take-option/litAction.js
ipfs add packages/abilities/dist/settle-option/litAction.js

# Copy the CID from each command output
```

#### 2.3 Document CIDs

Create `deployments/ability-cids.txt`:

```
# Vincent Ability IPFS CIDs
CREATE_PROFILE_CID=Qm...
CREATE_OFFER_CID=Qm...
TAKE_OPTION_CID=Qm...
SETTLE_OPTION_CID=Qm...
```

### Step 3: Register Vincent App

#### 3.1 Create Vincent App

1. Go to https://dashboard.heyvincent.ai/
2. Click "Create New App"
3. Fill in app details:
   - **Name**: Volvi Options Protocol
   - **Description**: USDC-only options protocol with gasless trading on Base
   - **App User URL**: `http://localhost:5173` (update later for production)
   - **Redirect URIs**:
     - `http://localhost:5173/callback` (development)
     - `https://yourdomain.com/callback` (add for production)

4. **Generate Delegatee Keys**:
   - Click "Generate Delegatee Keys"
   - **SAVE THE PRIVATE KEY SECURELY** (you can't retrieve it later!)
   - Copy the private key to a secure password manager

5. **Copy App ID**: Save your Vincent App ID

#### 3.2 Register Abilities

For each of the 4 abilities, register them in Vincent Dashboard:

**Create Profile Ability**
- Click "Add Ability" or "Register Custom Ability"
- Name: `Create Liquidity Profile`
- Description: `Create a USDC liquidity profile for writing options`
- Lit Action IPFS CID: `ipfs://Qm...` (from Step 2.3)
- Parameters Schema: Copy from `packages/abilities/src/create-profile/schema.ts`
- Policies:
  - Spending Limit (optional)
  - Time Lock (optional)

**Create Offer Ability**
- Name: `Create Option Offer`
- Description: `Create a signed option offer for the orderbook`
- Lit Action IPFS CID: `ipfs://Qm...`
- Parameters Schema: Copy from `packages/abilities/src/create-offer/schema.ts`
- Policies:
  - Token Whitelist (optional)
  - Premium Floor (optional)

**Take Option Ability**
- Name: `Take Option`
- Description: `Take an option gaslessly with USDC payment`
- Lit Action IPFS CID: `ipfs://Qm...`
- Parameters Schema: Copy from `packages/abilities/src/take-option/schema.ts`
- Policies:
  - Spending Limit (optional)
  - Exposure Limit (optional)

**Settle Option Ability**
- Name: `Settle Option`
- Description: `Settle an expired option and claim profits`
- Lit Action IPFS CID: `ipfs://Qm...`
- Parameters Schema: Copy from `packages/abilities/src/settle-option/schema.ts`
- Policies:
  - Auto-Settle (optional)

#### 3.3 Add ERC20 Approval Ability

- Search for built-in "ERC20 Approval" ability
- Add to your app
- This is required for users to approve USDC spending

#### 3.4 Save Vincent Configuration

Create `deployments/vincent-config.txt`:

```
VINCENT_APP_ID=your_app_id_here
DELEGATEE_PRIVATE_KEY=0x...  # KEEP SECURE!
```

### Step 4: Configure Backend

#### 4.1 Set Up Environment Variables

```bash
# Copy example file
cd packages/backend
cp .env.example .env

# Edit .env with your values
nano .env
```

Fill in all required values:

```bash
# From Vincent Dashboard (Step 3)
VINCENT_APP_ID=your_app_id_from_step_3
DELEGATEE_PRIVATE_KEY=0x...from_step_3
ALLOWED_AUDIENCE=http://localhost:5173

# From Smart Contract Deployment (Step 1)
CHAIN_ID=84532
RPC_URL=https://sepolia.base.org
OPTIONS_PROTOCOL_ADDRESS=0x...from_step_1

# Database (local for now)
MONGODB_URI=mongodb://localhost:27017/volvi-options
USE_MONGODB=true

# Server
PORT=3001
NODE_ENV=development
CORS_ALLOWED_DOMAIN=http://localhost:5173
LOG_LEVEL=info
```

#### 4.2 Set Up MongoDB

**Option A: Local MongoDB**

```bash
# Install MongoDB
# macOS: brew install mongodb-community
# Ubuntu: sudo apt-get install mongodb

# Start MongoDB
mongod

# Test connection
mongosh mongodb://localhost:27017/volvi-options
```

**Option B: MongoDB Atlas (Cloud)**

1. Go to https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Create database user
4. Whitelist IP (0.0.0.0/0 for testing)
5. Get connection string
6. Update `MONGODB_URI` in `.env`

### Step 5: Configure Frontend

#### 5.1 Set Up Environment Variables

```bash
# Copy example file
cd packages/frontend
cp .env.example .env

# Edit .env
nano .env
```

Fill in values:

```bash
# From Vincent Dashboard (same as backend)
VITE_VINCENT_APP_ID=your_app_id_from_step_3
VITE_REDIRECT_URI=http://localhost:5173/callback

# Backend API
VITE_BACKEND_URL=http://localhost:3001

# From Smart Contract Deployment (same as backend)
VITE_CHAIN_ID=84532
VITE_RPC_URL=https://sepolia.base.org
VITE_OPTIONS_PROTOCOL_ADDRESS=0x...from_step_1

# Environment
VITE_ENV=development
```

### Step 6: Test Locally

#### 6.1 Start All Services

```bash
# From project root
pnpm dev

# This starts:
# - Backend on http://localhost:3001
# - Frontend on http://localhost:5173
```

#### 6.2 Test Complete Flow

1. **Connect**:
   - Open http://localhost:5173
   - Click "Connect with Vincent"
   - Authenticate (email/wallet/social)
   - PKP (Agent Wallet) created

2. **Create Profile**:
   - Go to "Create Profile" tab
   - Fill in USDC amount (need test USDC on Base Sepolia)
   - Submit and approve
   - Check transaction on BaseScan
   - Verify profile in database

3. **Create Offer**:
   - Go to "Write Options" tab
   - Fill in offer details
   - Submit and sign
   - Verify offer appears in orderbook

4. **Take Option**:
   - Go to "Orderbook" tab
   - Click "Take" on an offer
   - Fill in amount and duration
   - Approve and submit
   - Verify position created

5. **Settle Option**:
   - Wait for option to expire (or mock expiry)
   - Go to "My Positions" tab
   - Click "Settle" on expired position
   - Verify settlement

#### 6.3 Verify Database

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/volvi-options

# Check collections
show collections

# Check data
db.profiles.find()
db.offers.find()
db.positions.find()
db.transaction_logs.find()
```

### Step 7: Deploy to Production

#### 7.1 Deploy Backend

**Using Railway (Recommended)**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to new project
railway link

# Set environment variables (all from packages/backend/.env)
railway variables set VINCENT_APP_ID=your_app_id
railway variables set DELEGATEE_PRIVATE_KEY=0x...
# ... set all other variables

# Deploy
railway up

# Get URL
railway status
```

**Using Heroku**

```bash
# Install Heroku CLI
# See: https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Create app
heroku create volvi-backend

# Set environment variables
heroku config:set VINCENT_APP_ID=your_app_id
heroku config:set DELEGATEE_PRIVATE_KEY=0x...
# ... set all variables

# Deploy
git subtree push --prefix packages/backend heroku main
```

#### 7.2 Deploy Frontend

**Using Vercel (Recommended)**

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy from frontend directory
cd packages/frontend
vercel

# Follow prompts
# Set environment variables in Vercel dashboard

# Production deployment
vercel --prod
```

**Using Netlify**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Build frontend
pnpm build:frontend

# Deploy
netlify deploy --dir=packages/frontend/dist --prod
```

#### 7.3 Update Vincent Dashboard

1. Go to Vincent Dashboard
2. Update App User URL to production URL
3. Add production Redirect URI
4. Update ALLOWED_AUDIENCE in backend .env

### Step 8: Post-Deployment

#### 8.1 Verify Production

- [ ] Backend health check: `https://api.yourdomain.com/health`
- [ ] Frontend loads: `https://yourdomain.com`
- [ ] Vincent authentication works
- [ ] Database persistence works
- [ ] All abilities execute successfully

#### 8.2 Set Up Monitoring

- Enable error tracking (Sentry)
- Set up uptime monitoring
- Configure alerts
- Monitor database performance

#### 8.3 Documentation

- Update README with production URLs
- Document any production-specific setup
- Create user guide
- Write troubleshooting guide

## Troubleshooting

### Contract Deployment Issues

**Error: Insufficient funds**
- Get more test ETH from Base Sepolia faucet
- Check balance: `cast balance <address> --rpc-url https://sepolia.base.org`

**Error: Contract already deployed**
- Use `--resume` flag to retry failed deployment
- Or deploy with different nonce

### IPFS Upload Issues

**File too large**
- Compress Lit Action code
- Use minification if possible

**CID not accessible**
- Ensure file is pinned
- Use IPFS gateway to test: `https://ipfs.io/ipfs/<CID>`

### Vincent Registration Issues

**Ability parameters not recognized**
- Ensure Zod schema is properly formatted
- Check Vincent Dashboard docs for schema format

**Delegatee key issues**
- Generate new keys if lost (can't recover)
- Update in all environments

### Database Issues

**Connection failed**
- Check MongoDB is running
- Verify connection string
- Check network/firewall

**Slow queries**
- Check indexes are created (auto-created on startup)
- Use MongoDB Compass to analyze

## Security Checklist

- [ ] `.env` files not committed to git
- [ ] Delegatee private key stored securely
- [ ] MongoDB access restricted (IP whitelist)
- [ ] CORS configured correctly
- [ ] Rate limiting enabled (production)
- [ ] HTTPS enabled (production)
- [ ] Smart contracts verified on BaseScan
- [ ] Ability code reviewed
- [ ] Test with small amounts first

## Next Steps After Deployment

1. **User Testing**: Get beta testers
2. **Bug Fixes**: Address any issues found
3. **Mainnet Preparation**:
   - Smart contract audit (recommended)
   - Deploy to Base Mainnet
   - Update all environment variables
4. **Launch**: Public announcement

## Resources

- Vincent Dashboard: https://dashboard.heyvincent.ai/
- Base Sepolia Explorer: https://sepolia.base.org/
- MongoDB Atlas: https://www.mongodb.com/cloud/atlas
- Railway: https://railway.app/
- Vercel: https://vercel.com/

---

**Status**: Ready for deployment
**Estimated Time**: 4-6 hours for complete setup
**Next Step**: Start with Step 1 (Smart Contract Deployment)
