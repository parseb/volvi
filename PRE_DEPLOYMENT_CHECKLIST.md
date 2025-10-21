# Pre-Deployment Checklist

**Last Updated**: 2025-10-21
**Target**: Base Sepolia Testnet
**Status**: Ready to Deploy

---

## ✅ Quick Start - Deploy in 5 Steps

1. **Get Test ETH** → Faucet
2. **Create `.env`** → Copy from `.env.foundry.example`
3. **Deploy Contracts** → Run forge script
4. **Set Up Vincent** → Register app and abilities
5. **Configure Apps** → Update backend/frontend `.env` files

---

## Detailed Pre-Deployment Checklist

### 1. Environment Setup ✅

- [ ] **Foundry Installed**
  ```bash
  curl -L https://foundry.paradigm.xyz | bash
  foundryup
  forge --version  # Should show version
  ```

- [ ] **Node.js & pnpm Installed**
  ```bash
  node --version   # Should be >= 22.16.0
  pnpm --version   # Should be >= 10.7.0
  ```

- [ ] **Dependencies Installed**
  ```bash
  pnpm install     # Install all packages
  ```

### 2. Deployer Account Setup 🔑

- [ ] **Create/Use Dedicated Deployer Account**
  - Don't use your main wallet
  - Create new account in MetaMask or use existing test account
  - Export private key (Settings → Security & Privacy → Reveal Private Key)

- [ ] **Get Test ETH on Base Sepolia**
  - Visit: https://www.alchemy.com/faucets/base-sepolia
  - Or: https://base.sepolia.etherscan.io/faucet
  - Need: ~0.05 ETH for deployment

  ```bash
  # Check balance (replace with your address)
  cast balance 0xYOUR_DEPLOYER_ADDRESS --rpc-url https://sepolia.base.org
  ```

- [ ] **Save Private Key Securely**
  - Store in password manager (1Password, Bitwarden, etc.)
  - Never share or commit to git
  - Keep backup in secure location

### 3. RPC & API Keys Setup 🌐

- [ ] **Get Alchemy Account (Optional but Recommended)**
  - Sign up: https://www.alchemy.com/
  - Create app for Base Sepolia
  - Copy API key
  - Better reliability than public RPCs

- [ ] **Get BaseScan API Key (For Verification)**
  - Sign up: https://basescan.org/register
  - Go to: https://basescan.org/myapikey
  - Create new API key
  - Free tier is sufficient

### 4. Create Foundry .env File 📝

- [ ] **Copy Example File**
  ```bash
  cp .env.foundry.example .env
  ```

- [ ] **Edit .env with Your Values**
  ```bash
  nano .env
  # Or use your preferred editor
  ```

- [ ] **Required Variables**:
  - `DEPLOYER_PRIVATE_KEY` - Your deployer account private key
  - `BASE_SEPOLIA_RPC_URL` - Base Sepolia RPC endpoint
  - `BASESCAN_API_KEY` - For contract verification (optional)

- [ ] **Verify .env Format**
  ```bash
  # Should look like this (with your actual values):
  DEPLOYER_PRIVATE_KEY=0xabc123...
  BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
  BASESCAN_API_KEY=YOURAPIKEY
  ```

### 5. Test Deployment (Dry Run) 🧪

- [ ] **Simulate Deployment Without Broadcasting**
  ```bash
  forge script script/DeployBaseSepoliaGasless.s.sol:DeployBaseSepoliaGaslessScript \
    --rpc-url base_sepolia \
    -vvvv

  # This will show what will be deployed without actually doing it
  ```

- [ ] **Check Output**:
  - Deployer address should match yours
  - Balance should be > 0.01 ETH
  - No errors in simulation

### 6. Smart Contract Deployment 🚀

- [ ] **Deploy to Base Sepolia**
  ```bash
  forge script script/DeployBaseSepoliaGasless.s.sol:DeployBaseSepoliaGaslessScript \
    --rpc-url base_sepolia \
    --broadcast \
    --verify \
    -vvvv
  ```

- [ ] **Wait for Deployment to Complete**
  - Should take 1-2 minutes
  - Watch for "Deployment Complete!" message

- [ ] **Save Contract Address**
  - Copy the `OptionsProtocolGasless` address from console output
  - Or check: `cat deployments/base-sepolia-gasless.txt`
  - Example: `0x1234...5678`

- [ ] **Verify on BaseScan**
  - Visit: https://sepolia.base.org/address/YOUR_CONTRACT_ADDRESS
  - Should show verified contract
  - Check "Contract" tab for verified source code

### 7. Build & Publish Abilities 📦

- [ ] **Build Abilities Package**
  ```bash
  pnpm --filter @volvi/abilities build

  # Check output
  ls -la packages/abilities/dist/
  ```

- [ ] **Publish to IPFS**

  **Option A: Pinata (Recommended)**
  - Sign up: https://pinata.cloud/
  - Upload each Lit Action:
    - `packages/abilities/dist/create-profile/litAction.js`
    - `packages/abilities/dist/create-offer/litAction.js`
    - `packages/abilities/dist/take-option/litAction.js`
    - `packages/abilities/dist/settle-option/litAction.js`
  - Copy CIDs for each

  **Option B: IPFS CLI**
  ```bash
  # Install IPFS if needed
  # macOS: brew install ipfs

  ipfs init
  ipfs daemon &

  # Upload each file
  ipfs add packages/abilities/dist/create-profile/litAction.js
  ipfs add packages/abilities/dist/create-offer/litAction.js
  ipfs add packages/abilities/dist/take-option/litAction.js
  ipfs add packages/abilities/dist/settle-option/litAction.js
  ```

- [ ] **Save IPFS CIDs**
  ```bash
  # Create ability-cids.txt
  cat > deployments/ability-cids.txt <<EOF
  CREATE_PROFILE_CID=Qm...
  CREATE_OFFER_CID=Qm...
  TAKE_OPTION_CID=Qm...
  SETTLE_OPTION_CID=Qm...
  EOF
  ```

### 8. Vincent Dashboard Setup 🎯

- [ ] **Create Vincent App**
  - Visit: https://dashboard.heyvincent.ai/
  - Click "Create New App"
  - Fill in:
    - Name: `Volvi Options Protocol`
    - Description: `USDC-only options protocol with gasless trading`
    - App User URL: `http://localhost:5173` (update for production later)
    - Redirect URIs: `http://localhost:5173/callback`

- [ ] **Generate Delegatee Keys**
  - Click "Generate Delegatee Keys"
  - **SAVE PRIVATE KEY IMMEDIATELY** (can't retrieve later!)
  - Store in password manager
  - Copy App ID

- [ ] **Register Abilities**

  For each ability:
  1. Click "Add Ability" → "Custom Ability"
  2. Fill in details:
     - Name: (e.g., "Create Liquidity Profile")
     - Description: (from ability files)
     - Lit Action CID: `ipfs://Qm...` (from step 7)
     - Parameters: (from schema.ts files)
  3. Save ability

  **Abilities to register**:
  - Create Profile
  - Create Offer
  - Take Option
  - Settle Option

- [ ] **Add ERC20 Approval Ability**
  - Search built-in abilities
  - Add "ERC20 Approval"
  - Users need this for USDC approvals

- [ ] **Save Vincent Configuration**
  ```bash
  cat > deployments/vincent-config.txt <<EOF
  VINCENT_APP_ID=your_app_id
  DELEGATEE_PRIVATE_KEY=0x...
  EOF
  ```

### 9. Configure Backend 🖥️

- [ ] **Create Backend .env**
  ```bash
  cd packages/backend
  cp .env.example .env
  ```

- [ ] **Fill in Values**
  ```bash
  # Edit packages/backend/.env

  # Vincent (from step 8)
  VINCENT_APP_ID=your_vincent_app_id
  DELEGATEE_PRIVATE_KEY=0x...
  ALLOWED_AUDIENCE=http://localhost:5173

  # Blockchain (from step 6)
  CHAIN_ID=84532
  RPC_URL=https://sepolia.base.org
  OPTIONS_PROTOCOL_ADDRESS=0x...  # From deployment

  # Database
  MONGODB_URI=mongodb://localhost:27017/volvi-options
  USE_MONGODB=true

  # Server
  PORT=3001
  NODE_ENV=development
  CORS_ALLOWED_DOMAIN=http://localhost:5173
  LOG_LEVEL=info
  ```

- [ ] **Set Up MongoDB**

  **Option A: Local**
  ```bash
  # Install MongoDB
  # macOS: brew install mongodb-community
  # Ubuntu: sudo apt-get install mongodb

  # Start MongoDB
  mongod
  ```

  **Option B: MongoDB Atlas (Cloud)**
  - Sign up: https://www.mongodb.com/cloud/atlas
  - Create free cluster
  - Get connection string
  - Update `MONGODB_URI` in .env

### 10. Configure Frontend 💻

- [ ] **Create Frontend .env**
  ```bash
  cd packages/frontend
  cp .env.example .env
  ```

- [ ] **Fill in Values**
  ```bash
  # Edit packages/frontend/.env

  # Vincent (same as backend)
  VITE_VINCENT_APP_ID=your_vincent_app_id
  VITE_REDIRECT_URI=http://localhost:5173/callback

  # Backend API
  VITE_BACKEND_URL=http://localhost:3001

  # Blockchain (same as backend)
  VITE_CHAIN_ID=84532
  VITE_RPC_URL=https://sepolia.base.org
  VITE_OPTIONS_PROTOCOL_ADDRESS=0x...

  # Environment
  VITE_ENV=development
  ```

### 11. Test Locally 🧪

- [ ] **Start All Services**
  ```bash
  # From project root
  pnpm dev

  # Should start:
  # - Backend on http://localhost:3001
  # - Frontend on http://localhost:5173
  ```

- [ ] **Test Health Check**
  ```bash
  curl http://localhost:3001/health
  # Should return: {"status":"ok"}
  ```

- [ ] **Test Frontend**
  - Open http://localhost:5173
  - Should see login page
  - No console errors

- [ ] **Test Vincent Authentication**
  - Click "Connect with Vincent"
  - Choose authentication method
  - Should create/connect PKP
  - Should redirect to dashboard

- [ ] **Test Database Connection**
  ```bash
  # Check MongoDB
  mongosh mongodb://localhost:27017/volvi-options

  # Should connect successfully
  show collections
  ```

### 12. End-to-End Testing 🎯

- [ ] **Get Test USDC on Base Sepolia**
  - Base Sepolia USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
  - Use faucet or bridge from testnet

- [ ] **Test Complete Flow**:
  1. [ ] Approve USDC spending
  2. [ ] Create liquidity profile
  3. [ ] Create option offer
  4. [ ] Take option (with second account)
  5. [ ] Wait for expiry / settle option

- [ ] **Verify Database Persistence**
  ```bash
  mongosh mongodb://localhost:27017/volvi-options

  db.profiles.find()
  db.offers.find()
  db.positions.find()
  ```

- [ ] **Check Transaction Logs**
  ```bash
  db.transaction_logs.find().sort({createdAt: -1})
  ```

---

## 🎉 Deployment Complete!

If all checkboxes are checked, you have:
- ✅ Smart contracts deployed to Base Sepolia
- ✅ Abilities published to IPFS
- ✅ Vincent app registered and configured
- ✅ Backend and frontend configured
- ✅ Local testing complete
- ✅ End-to-end flow verified

---

## 📋 Quick Reference

### Important Addresses

```bash
# Base Sepolia Testnet
Chain ID: 84532
RPC: https://sepolia.base.org
USDC: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
Pyth: 0xA2aa501b19aff244D90cc15a4Cf739D2725B5729
Uniswap Router: 0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4

# Your Deployment (fill in after deployment)
OptionsProtocolGasless: 0x...
```

### Useful Commands

```bash
# Check deployer balance
cast balance <ADDRESS> --rpc-url https://sepolia.base.org

# Check contract code
cast code <CONTRACT_ADDRESS> --rpc-url https://sepolia.base.org

# Read contract
cast call <CONTRACT_ADDRESS> "function()" --rpc-url https://sepolia.base.org

# Start services
pnpm dev

# Check logs
tail -f packages/backend/logs/*.log
```

### Resources

- Vincent Dashboard: https://dashboard.heyvincent.ai/
- Base Sepolia Explorer: https://sepolia.base.org/
- BaseScan: https://sepolia.basescan.org/
- Alchemy: https://www.alchemy.com/
- MongoDB Atlas: https://www.mongodb.com/cloud/atlas

---

## 🚨 Troubleshooting

### Deployment fails with "insufficient funds"
- Get more test ETH from faucet
- Check balance: `cast balance <address> --rpc-url base_sepolia`

### Contract verification fails
- Check BASESCAN_API_KEY is set correctly
- Try manual verification on BaseScan
- Contract may still work without verification

### Vincent abilities not working
- Check IPFS CIDs are correct
- Verify abilities are registered in dashboard
- Ensure App ID matches in all configs

### Database connection errors
- Check MongoDB is running: `mongosh`
- Verify MONGODB_URI format
- Check USE_MONGODB=true

### Frontend not connecting to backend
- Check CORS_ALLOWED_DOMAIN matches frontend URL
- Verify backend is running: `curl localhost:3001/health`
- Check VITE_BACKEND_URL is correct

---

**Next Steps**: Follow [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for production deployment!
