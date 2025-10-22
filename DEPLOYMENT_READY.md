# Base Mainnet Deployment - Ready to Deploy

**Status**: 🟡 SECURITY ISSUE MUST BE RESOLVED FIRST
**Date**: 2025-10-22

---

## 🚨 CRITICAL: Private Key Security Issue

**Your private key shared in the previous conversation is COMPROMISED:**

```
0xe9cc26bc179ca4303400a72a9d54ee1ff8af614a7811fc12ff5e235490b9ee4c
```

**This key is now public and CANNOT be used for mainnet deployment.**

---

## ✅ What's Ready

The following deployment infrastructure has been created:

### 1. Deployment Scripts ✅

- **[script/DeployBaseMainnet.s.sol](script/DeployBaseMainnet.s.sol)** - Mainnet deployment script with safety checks
- **[deploy-mainnet-safe.sh](deploy-mainnet-safe.sh)** - Interactive deployment script with security validation

### 2. Documentation ✅

- **[MAINNET_DEPLOYMENT_SECURITY.md](MAINNET_DEPLOYMENT_SECURITY.md)** - Comprehensive security-first deployment guide
- **[BASE_MAINNET_ADDRESSES.md](BASE_MAINNET_ADDRESSES.md)** - Network addresses and configuration reference
- **[PRE_DEPLOYMENT_CHECKLIST.md](PRE_DEPLOYMENT_CHECKLIST.md)** - Step-by-step deployment checklist

### 3. Smart Contracts ✅

- **OptionsProtocol.sol** - Ready for deployment (tested on Base Sepolia)
- Base Sepolia deployment verified at: `0xD7AFfB2B3303e9Cb44C9d9aFA6bD938200b3C8F2`

### 4. Vincent Abilities ✅

All 4 abilities published to npm with real IPFS CIDs:
- Create Profile: `QmWKSV282p3NCWn7WaPW43KtrPqgAtzTK7A2DGYTTdXh15`
- Create Offer: `QmeuzKma2HrfGyMpvZj19TY15E3JJe4UjS4heYNdwwCQKE`
- Take Option: `Qma41tK42VBM5fjqFKzdktzb7yLjZGGjjJsi1VK6ewnR1L`
- Settle Option: `QmWFd4yeYpat1ZL69KKutkCfPbMnKF6WP4WmFx17uGX1eM`

---

## 🔒 What You MUST Do Before Deployment

### Step 1: Generate NEW Private Key

**DO NOT USE the exposed key. Generate a new one:**

#### Option A: Using Cast (Recommended)
```bash
cast wallet new

# Save the output securely:
# Address:     0x...
# Private key: 0x...
```

#### Option B: Using MetaMask
1. Open MetaMask
2. Account menu → "Add account or hardware wallet"
3. "Add a new account"
4. Name it "Volvi Mainnet Deployer"
5. Export private key (Settings → Security & Privacy)

### Step 2: Fund NEW Address

**Your new deployer address needs:**
- **Minimum**: 0.05 ETH on Base Mainnet
- **Recommended**: 0.1 ETH for safety buffer

**How to get ETH on Base:**
1. **Bridge from Ethereum**: https://bridge.base.org/ (5-10 minutes)
2. **Buy on exchange**: Some exchanges support Base withdrawals
3. **Swap on Base**: If you have other tokens on Base

**Verify funding:**
```bash
cast balance <YOUR_NEW_ADDRESS> --rpc-url https://mainnet.base.org
```

### Step 3: Update .env File

**Create/update your .env file with the NEW private key:**

```bash
# Copy example if needed
cp .env.foundry.example .env

# Edit with your NEW private key
nano .env
```

**Required configuration:**
```bash
# YOUR NEW PRIVATE KEY (not the exposed one!)
DEPLOYER_PRIVATE_KEY=0x...

# Base Mainnet RPC
BASE_MAINNET_RPC_URL=https://mainnet.base.org

# BaseScan API key (for verification)
BASESCAN_API_KEY=...
```

---

## 🚀 Deployment Process

### Quick Start (Recommended)

Use the interactive deployment script:

```bash
./deploy-mainnet-safe.sh
```

This script will:
1. ✅ Verify .env file exists
2. ✅ Check private key is NOT the compromised one
3. ✅ Verify Foundry is installed
4. ✅ Check deployer balance (>= 0.05 ETH required)
5. ✅ Verify connected to Base Mainnet (Chain ID 8453)
6. 🧪 Offer to do a DRY RUN first (recommended!)
7. 🚀 Deploy to mainnet with your confirmation

### Manual Deployment

If you prefer manual deployment:

#### 1. Dry Run (Simulation)
```bash
forge script script/DeployBaseMainnet.s.sol:DeployBaseMainnetScript \
  --rpc-url https://mainnet.base.org \
  -vvvv

# Review output, check for errors
```

#### 2. Actual Deployment
```bash
forge script script/DeployBaseMainnet.s.sol:DeployBaseMainnetScript \
  --rpc-url https://mainnet.base.org \
  --broadcast \
  --verify \
  -vvvv

# Wait for deployment and verification to complete
```

#### 3. Get Contract Address
```bash
cat deployments/base-mainnet.txt

# Copy the BASE_MAINNET_PROTOCOL_ADDRESS value
```

---

## 📋 After Deployment

### 1. Verify on BaseScan

```bash
# Check your contract
CONTRACT_ADDRESS=$(grep "BASE_MAINNET_PROTOCOL_ADDRESS" deployments/base-mainnet.txt | cut -d'=' -f2)
echo "https://basescan.org/address/$CONTRACT_ADDRESS"

# Open in browser to verify:
# ✅ Contract deployed
# ✅ Source code verified
# ✅ Read/Write functions available
```

### 2. Update Backend Configuration

Edit `packages/backend/.env`:
```bash
# Update these values:
CHAIN_ID=8453
RPC_URL=https://mainnet.base.org
OPTIONS_PROTOCOL_ADDRESS=0x...  # From deployments/base-mainnet.txt
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Keep Vincent config (same as testnet):
VINCENT_APP_ID=...
DELEGATEE_PRIVATE_KEY=...
CREATE_PROFILE_ABILITY_CID=QmWKSV282p3NCWn7WaPW43KtrPqgAtzTK7A2DGYTTdXh15
CREATE_OFFER_ABILITY_CID=QmeuzKma2HrfGyMpvZj19TY15E3JJe4UjS4heYNdwwCQKE
TAKE_OPTION_ABILITY_CID=Qma41tK42VBM5fjqFKzdktzb7yLjZGGjjJsi1VK6ewnR1L
SETTLE_OPTION_ABILITY_CID=QmWFd4yeYpat1ZL69KKutkCfPbMnKF6WP4WmFx17uGX1eM

# Production:
NODE_ENV=production
```

### 3. Update Frontend Configuration

Edit `packages/frontend/.env`:
```bash
VITE_CHAIN_ID=8453
VITE_RPC_URL=https://mainnet.base.org
VITE_OPTIONS_PROTOCOL_ADDRESS=0x...  # From deployments/base-mainnet.txt

VITE_VINCENT_APP_ID=...
VITE_REDIRECT_URI=https://yourdomain.com/callback
VITE_BACKEND_URL=https://api.yourdomain.com

VITE_ENV=production
```

### 4. Test with Small Amounts

**DO NOT test with large amounts!**

Start with **$10 USDC** and test:
1. Approve USDC
2. Create profile
3. Create offer
4. Take option (different account)
5. Monitor gas costs

### 5. Set Up Monitoring

**Recommended tools:**
- **Tenderly**: https://tenderly.co/ - Transaction monitoring and alerts
- **OpenZeppelin Defender**: https://defender.openzeppelin.com/ - Security monitoring
- **Grafana**: Custom dashboard for metrics

---

## 📊 Deployment Checklist

Use this checklist to track your progress:

### Pre-Deployment
- [ ] Generated NEW private key (not the compromised one)
- [ ] Funded new address with >= 0.1 ETH on Base Mainnet
- [ ] Created/updated .env file with new key
- [ ] Verified .env has correct RPC URL and API keys
- [ ] Read MAINNET_DEPLOYMENT_SECURITY.md thoroughly
- [ ] Backed up private key securely (encrypted)

### Deployment
- [ ] Ran dry run successfully (no errors)
- [ ] Reviewed gas estimates
- [ ] Deployed to Base Mainnet
- [ ] Verified contract on BaseScan
- [ ] Saved deployment info (deployments/base-mainnet.txt)
- [ ] Tested contract read functions work

### Post-Deployment
- [ ] Updated backend .env with mainnet contract address
- [ ] Updated frontend .env with mainnet contract address
- [ ] Tested with small USDC amounts ($10-50)
- [ ] Set up monitoring (Tenderly/Defender)
- [ ] Documented deployment for team
- [ ] Created backup of deployment info

### Security
- [ ] Removed private key from .env after deployment
- [ ] Stored private key in hardware wallet or secure vault
- [ ] Set up alerts for unusual transactions
- [ ] Prepared emergency procedures
- [ ] Scheduled security audit (if applicable)

---

## 🆘 Troubleshooting

### "Insufficient ETH balance for deployment"
- **Solution**: Fund deployer address with at least 0.05 ETH
- **Check balance**: `cast balance <ADDRESS> --rpc-url https://mainnet.base.org`

### "You are using the COMPROMISED private key"
- **Solution**: Generate NEW private key as described in Step 1
- **Never use**: `0xe9cc26bc179ca4303400a72a9d54ee1ff8af614a7811fc12ff5e235490b9ee4c`

### "forge: command not found"
- **Solution**: Install Foundry
  ```bash
  curl -L https://foundry.paradigm.xyz | bash
  foundryup
  ```

### "Chain ID mismatch"
- **Solution**: Check RPC URL points to Base Mainnet
- **Correct URL**: `https://mainnet.base.org`
- **Verify**: `cast chain-id --rpc-url https://mainnet.base.org` should return `8453`

### Contract verification fails
- **Solution**: Try manual verification on BaseScan
- **Check**: BASESCAN_API_KEY is correct in .env
- **Note**: Contract will work even if verification fails (can verify manually later)

---

## 📚 Additional Resources

### Documentation Files
- **[MAINNET_DEPLOYMENT_SECURITY.md](MAINNET_DEPLOYMENT_SECURITY.md)** - Full security guide
- **[BASE_MAINNET_ADDRESSES.md](BASE_MAINNET_ADDRESSES.md)** - Network addresses reference
- **[PRE_DEPLOYMENT_CHECKLIST.md](PRE_DEPLOYMENT_CHECKLIST.md)** - Detailed checklist
- **[SPECIFICATION.md](SPECIFICATION.md)** - Project specification

### External Resources
- **Base Docs**: https://docs.base.org/
- **BaseScan**: https://basescan.org/
- **Bridge**: https://bridge.base.org/
- **Vincent Dashboard**: https://dashboard.heyvincent.ai/
- **Foundry Book**: https://book.getfoundry.sh/

---

## ✅ Summary

**You are ready to deploy once you:**

1. ✅ Generate a NEW private key (not the exposed one)
2. ✅ Fund the new address with >= 0.1 ETH on Base Mainnet
3. ✅ Update .env with the new key
4. ✅ Run the deployment script: `./deploy-mainnet-safe.sh`

**The deployment script will:**
- Automatically check for the compromised key and block deployment
- Verify your balance and configuration
- Offer a dry run option (recommended!)
- Deploy with your confirmation
- Save deployment info automatically

**Total time**: ~5-10 minutes (after setup)
**Estimated cost**: 0.03-0.05 ETH (~$75-125 at $2500/ETH)

---

## 🎯 Next Steps

**After successful deployment:**

1. ✅ Verify contract on BaseScan
2. ✅ Update backend/frontend configuration
3. ✅ Test with small amounts
4. ✅ Set up monitoring
5. 🚀 Launch to users!

---

**Ready to deploy? Run:**

```bash
./deploy-mainnet-safe.sh
```

Good luck! 🚀
