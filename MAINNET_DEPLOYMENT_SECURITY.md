# Base Mainnet Deployment - Security First Guide

**Date**: 2025-10-22
**Target**: Base Mainnet (Chain ID: 8453)
**Status**: 🔴 CRITICAL SECURITY ISSUE - READ CAREFULLY

---

## 🚨 CRITICAL SECURITY ISSUE

### Private Key Exposure

**THE PRIVATE KEY SHARED IN THE PREVIOUS CONVERSATION IS NOW COMPROMISED.**

```
Key: 0xe9cc26bc179ca4303400a72a9d54ee1ff8af614a7811fc12ff5e235490b9ee4c
Status: ❌ COMPROMISED - DO NOT USE
Risk: HIGH - Anyone who saw the chat can access funds
```

### ⚠️ IMMEDIATE ACTION REQUIRED

**Before ANY deployment, you MUST:**

1. **Generate a NEW deployer private key**
2. **Transfer any funds FROM the exposed address TO the new address**
3. **Never use the exposed key for mainnet operations**

---

## 🔐 Step 1: Create NEW Secure Deployer Key

### Option A: Using MetaMask (Recommended)

```bash
# 1. Open MetaMask
# 2. Click account menu → "Add account or hardware wallet"
# 3. Click "Add a new account"
# 4. Name it "Volvi Mainnet Deployer"
# 5. Click the 3 dots → Account details → Export Private Key
# 6. Enter password and SECURELY SAVE the new key
```

### Option B: Using Cast (Command Line)

```bash
# Generate a new wallet
cast wallet new

# Output will show:
# Successfully created new keypair.
# Address:     0x...
# Private key: 0x...

# SAVE THIS PRIVATE KEY SECURELY!
```

### Option C: Using Hardware Wallet (Most Secure)

```bash
# Use Ledger or Trezor for maximum security
# Follow hardware wallet setup guide
# Hardware wallets keep keys offline
```

---

## 💰 Step 2: Fund Your NEW Deployer Address

### Check Current Balance of Exposed Address

```bash
# Check the EXPOSED address (DO NOT USE FOR DEPLOYMENT)
EXPOSED_ADDRESS="0x..." # Fill from exposed private key
cast balance $EXPOSED_ADDRESS --rpc-url https://mainnet.base.org

# If it has funds, transfer them to your NEW address
```

### Fund New Deployer Address

**You need approximately 0.1 ETH on Base Mainnet for:**
- Deployment gas: ~0.03-0.05 ETH
- Safety buffer: ~0.05 ETH
- Total recommended: **0.1 ETH**

**Methods to get ETH on Base Mainnet:**

1. **Bridge from Ethereum Mainnet**
   - Visit: https://bridge.base.org/
   - Connect wallet
   - Bridge ETH from Ethereum to Base
   - Takes 5-10 minutes

2. **Buy directly on Base**
   - Use Coinbase (Base is built by Coinbase)
   - Buy USDC, swap to ETH on Base
   - Or bridge from other chains via LayerZero

3. **Transfer from Exchange**
   - Some exchanges support Base network withdrawals
   - Cheaper than bridging from L1

### Verify New Address is Funded

```bash
# Replace with YOUR NEW address
NEW_DEPLOYER_ADDRESS="0x..."

cast balance $NEW_DEPLOYER_ADDRESS --rpc-url https://mainnet.base.org

# Should show at least 0.1 ETH
```

---

## 🔧 Step 3: Update .env with NEW Key

```bash
# Open .env file
nano .env

# Update ONLY these variables:
DEPLOYER_PRIVATE_KEY=0x... # YOUR NEW PRIVATE KEY (not the exposed one!)
BASE_MAINNET_RPC_URL=https://mainnet.base.org
BASESCAN_API_KEY=... # Your BaseScan API key
```

### Verify .env Configuration

```bash
# Check that .env has correct format (without revealing keys)
grep -E "^DEPLOYER_PRIVATE_KEY=" .env >/dev/null && echo "✅ Deployer key set" || echo "❌ Missing deployer key"
grep -E "^BASE_MAINNET_RPC_URL=" .env >/dev/null && echo "✅ RPC URL set" || echo "❌ Missing RPC URL"
grep -E "^BASESCAN_API_KEY=" .env >/dev/null && echo "✅ BaseScan API key set" || echo "❌ Missing API key"
```

---

## 🧪 Step 4: DRY RUN (Simulation - No Real Deployment)

**ALWAYS test first without broadcasting!**

```bash
# Simulate deployment (does NOT actually deploy)
forge script script/DeployBaseMainnet.s.sol:DeployBaseMainnetScript \
  --rpc-url https://mainnet.base.org \
  -vvvv

# Review output:
# ✅ Deployer address matches your NEW address
# ✅ Balance shows >= 0.1 ETH
# ✅ No errors in simulation
# ✅ Estimated gas cost is reasonable
```

### Expected Dry Run Output

```
=================================================
!!!    DEPLOYING TO BASE MAINNET    !!!
!!!    THIS USES REAL MONEY         !!!
=================================================
Deployer: 0x... (YOUR NEW ADDRESS)
Balance: 0.15 ETH (or more)
=================================================

Deploying OptionsProtocol...
[Simulation output...]

=================================================
🎉 SIMULATION COMPLETE!
=================================================
OptionsProtocol: 0x... (simulated address)
```

**If you see ANY errors, STOP and fix them before proceeding.**

---

## 🚀 Step 5: ACTUAL MAINNET DEPLOYMENT

### Final Security Checklist

Before running this command, verify:

- [ ] **NEW private key is in .env** (NOT the exposed one)
- [ ] **Deployer address has >= 0.1 ETH on Base Mainnet**
- [ ] **BaseScan API key is set** (for verification)
- [ ] **Dry run completed successfully** (Step 4)
- [ ] **You understand contracts are IMMUTABLE** once deployed
- [ ] **You have backup of private key** (encrypted, offline)
- [ ] **You are in a secure location** (not public wifi)

### Deploy to Base Mainnet

```bash
# REAL DEPLOYMENT - USES REAL ETH
forge script script/DeployBaseMainnet.s.sol:DeployBaseMainnetScript \
  --rpc-url https://mainnet.base.org \
  --broadcast \
  --verify \
  -vvvv

# The script will:
# 1. Show deployment details
# 2. Wait 10 seconds (gives you time to cancel with Ctrl+C)
# 3. Deploy OptionsProtocol contract
# 4. Verify on BaseScan automatically
# 5. Save deployment info to deployments/base-mainnet.txt
```

### During Deployment

```
⚠️  WARNING: You are about to deploy to BASE MAINNET
⚠️  This will spend REAL ETH
⚠️  Contracts are IMMUTABLE once deployed
⚠️  Press Ctrl+C within 10 seconds to cancel...

[10 second countdown...]

🚀 Starting deployment to Base Mainnet...

Deploying OptionsProtocol...
[Transaction details...]

=================================================
🎉 MAINNET DEPLOYMENT COMPLETE!
=================================================
OptionsProtocol: 0x1234567890abcdef... (REAL ADDRESS)
Network: Base Mainnet (Chain ID: 8453)
=================================================
```

### Save Contract Address

```bash
# Deployment info is automatically saved to:
cat deployments/base-mainnet.txt

# Output:
# BASE_MAINNET_PROTOCOL_ADDRESS=0x...
# BASE_MAINNET_PYTH=0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a
# BASE_MAINNET_UNISWAP_ROUTER=0x2626664c2603336E57B271c5C0b26F421741e481
# BASE_MAINNET_USDC=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
# DEPLOYER=0x...
```

---

## ✅ Step 6: Verify Deployment

### Check on BaseScan

```bash
# Open in browser
PROTOCOL_ADDRESS=$(grep "BASE_MAINNET_PROTOCOL_ADDRESS" deployments/base-mainnet.txt | cut -d'=' -f2)
echo "https://basescan.org/address/$PROTOCOL_ADDRESS"

# Should show:
# ✅ Contract deployed
# ✅ Source code verified
# ✅ Read/Write functions available
```

### Verify Contract is Functional

```bash
# Read contract using cast
PROTOCOL_ADDRESS=$(grep "BASE_MAINNET_PROTOCOL_ADDRESS" deployments/base-mainnet.txt | cut -d'=' -f2)

# Check USDC address
cast call $PROTOCOL_ADDRESS "usdc()(address)" --rpc-url https://mainnet.base.org

# Should return: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (Base Mainnet USDC)

# Check Pyth address
cast call $PROTOCOL_ADDRESS "pyth()(address)" --rpc-url https://mainnet.base.org

# Should return: 0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a (Base Mainnet Pyth)
```

---

## 🔄 Step 7: Update Backend Configuration

```bash
# Edit backend .env
nano packages/backend/.env

# Update with mainnet values:
CHAIN_ID=8453
RPC_URL=https://mainnet.base.org
OPTIONS_PROTOCOL_ADDRESS=0x... # From deployments/base-mainnet.txt
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Keep your Vincent credentials:
VINCENT_APP_ID=... # Your Vincent app ID
DELEGATEE_PRIVATE_KEY=0x... # Your Vincent delegatee key
ALLOWED_AUDIENCE=https://yourdomain.com # Update for production

# Update ability CIDs (same as testnet):
CREATE_PROFILE_ABILITY_CID=QmWKSV282p3NCWn7WaPW43KtrPqgAtzTK7A2DGYTTdXh15
CREATE_OFFER_ABILITY_CID=QmeuzKma2HrfGyMpvZj19TY15E3JJe4UjS4heYNdwwCQKE
TAKE_OPTION_ABILITY_CID=Qma41tK42VBM5fjqFKzdktzb7yLjZGGjjJsi1VK6ewnR1L
SETTLE_OPTION_ABILITY_CID=QmWFd4yeYpat1ZL69KKutkCfPbMnKF6WP4WmFx17uGX1eM

# Production settings:
NODE_ENV=production
LOG_LEVEL=info
```

---

## 🌐 Step 8: Update Frontend Configuration

```bash
# Edit frontend .env
nano packages/frontend/.env

# Update with mainnet values:
VITE_CHAIN_ID=8453
VITE_RPC_URL=https://mainnet.base.org
VITE_OPTIONS_PROTOCOL_ADDRESS=0x... # From deployments/base-mainnet.txt

# Update Vincent config:
VITE_VINCENT_APP_ID=... # Your Vincent app ID
VITE_REDIRECT_URI=https://yourdomain.com/callback # Update for production

# Backend API:
VITE_BACKEND_URL=https://api.yourdomain.com # Update for production

# Environment:
VITE_ENV=production
```

---

## 🧪 Step 9: Test with Small Amounts

**DO NOT test with large amounts immediately!**

### Test Checklist

1. **Approve Small USDC Amount**
   - Start with $10 USDC only
   - Verify approval transaction succeeds

2. **Create Test Profile**
   - Use minimal USDC amount
   - Verify profile creation on-chain

3. **Create Test Offer**
   - Small premium amounts only
   - Verify offer appears in orderbook

4. **Take Option (Different Account)**
   - Use second test account
   - Verify position creation

5. **Monitor Gas Costs**
   - Check actual vs estimated gas
   - Verify gas sponsorship works (if enabled)

### Monitoring Setup

```bash
# Set up monitoring with Tenderly
# 1. Sign up at https://tenderly.co/
# 2. Add your contract address
# 3. Set up alerts for:
#    - Failed transactions
#    - Unusual gas usage
#    - Large transfers
```

---

## 📋 Post-Deployment Checklist

After successful deployment:

- [ ] **Contract verified on BaseScan**
- [ ] **Deployment info saved in deployments/base-mainnet.txt**
- [ ] **Backend .env updated with mainnet contract address**
- [ ] **Frontend .env updated with mainnet contract address**
- [ ] **Tested with small amounts ($10-50 USDC)**
- [ ] **Monitoring set up (Tenderly/Defender)**
- [ ] **Emergency procedures documented**
- [ ] **Private keys backed up securely (encrypted)**
- [ ] **Team notified of deployment**
- [ ] **Social media announcement prepared** (if applicable)

---

## 🚨 Emergency Procedures

### If Something Goes Wrong

1. **Transaction Stuck**
   ```bash
   # Check transaction status
   cast tx <TX_HASH> --rpc-url https://mainnet.base.org

   # Speed up transaction (if needed)
   # Use MetaMask or wallet to increase gas price
   ```

2. **Contract Bug Discovered**
   - **Contracts are IMMUTABLE - cannot be changed**
   - Deploy new version with fixes
   - Migrate users to new contract
   - Communicate clearly with users

3. **Funds at Risk**
   - If critical bug: pause protocol operations
   - Contact security team immediately
   - Prepare incident report
   - Communicate with users transparently

---

## 🔒 Security Best Practices

### After Deployment

1. **Secure Private Keys**
   - Remove from .env after deployment
   - Store in hardware wallet or secure vault
   - Never share or commit to git

2. **Monitor Contract Activity**
   - Set up alerts for unusual transactions
   - Review logs daily
   - Monitor gas usage patterns

3. **Prepare for Audits**
   - Get professional security audit
   - Run automated security tools (Slither, Mythril)
   - Bug bounty program (optional)

4. **Documentation**
   - Keep deployment records secure
   - Document all configuration changes
   - Maintain runbooks for common issues

---

## 📞 Support & Resources

- **Base Mainnet Explorer**: https://basescan.org/
- **Base Mainnet Bridge**: https://bridge.base.org/
- **Base Docs**: https://docs.base.org/
- **Vincent Dashboard**: https://dashboard.heyvincent.ai/
- **Foundry Docs**: https://book.getfoundry.sh/

---

## ⚠️ FINAL SECURITY REMINDER

**NEVER use the exposed private key for mainnet deployment:**
```
0xe9cc26bc179ca4303400a72a9d54ee1ff8af614a7811fc12ff5e235490b9ee4c
```

**This key is COMPROMISED and publicly visible. Anyone can access funds sent to it.**

**Generate a NEW key as described in Step 1 before proceeding.**

---

## ✅ Ready to Deploy?

Once you have:
1. ✅ Generated NEW private key
2. ✅ Funded NEW address with >= 0.1 ETH
3. ✅ Updated .env with NEW key
4. ✅ Completed dry run successfully
5. ✅ Read all security warnings

**You can proceed with Step 5: ACTUAL MAINNET DEPLOYMENT**

Good luck! 🚀
