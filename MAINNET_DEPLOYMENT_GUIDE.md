# Base Mainnet Deployment Guide

**⚠️ CRITICAL: This is MAINNET - Real Money Involved**

---

## 🛑 BEFORE YOU START

### Security Checklist

- [ ] **NEVER share private keys** in chat, screenshots, or any communication
- [ ] Use a **dedicated deployer wallet** (not your main wallet)
- [ ] Ensure contracts are **fully audited** before mainnet deployment
- [ ] Have sufficient **ETH for gas fees** (~0.05-0.1 ETH recommended)
- [ ] **Double-check all contract addresses** before deployment
- [ ] **Test everything on testnet first**

---

## Step 1: Secure Environment Setup

### Create `.env` file (DO NOT COMMIT TO GIT)

```bash
cd /home/pb/Desktop/Volvi
touch .env
chmod 600 .env  # Restrict permissions to owner only
```

### Edit `.env` with your private key

```bash
# DEPLOYER PRIVATE KEY
# ⚠️ KEEP THIS SECRET - Never share or commit to git
DEPLOYER_PRIVATE_KEY=0xYOUR_ACTUAL_PRIVATE_KEY_HERE

# BASE MAINNET RPC
BASE_MAINNET_RPC_URL=https://mainnet.base.org
# Or use Alchemy (recommended for better reliability):
# BASE_MAINNET_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY

# BASESCAN API KEY (for contract verification)
# Get from: https://basescan.org/myapikey
BASESCAN_API_KEY=YOUR_BASESCAN_API_KEY_HERE
```

---

## Step 2: Verify Deployer Account

### Check Account Balance

```bash
# Get deployer address from private key
cast wallet address --private-key $DEPLOYER_PRIVATE_KEY

# Check ETH balance on Base Mainnet
cast balance YOUR_DEPLOYER_ADDRESS --rpc-url https://mainnet.base.org
```

**Minimum Required:** 0.05 ETH for deployment gas fees

---

## Step 3: Review Deployment Script

The deployment script is located at:
```
script/DeployBaseSepolia.s.sol
```

You'll need to create a mainnet version:

```bash
cp script/DeployBaseSepolia.s.sol script/DeployBaseMainnet.s.sol
```

Edit `script/DeployBaseMainnet.s.sol` and update:
- RPC URL to mainnet
- Verify addresses of dependencies (USDC, Pyth, etc.)
- Gas price settings if needed

---

## Step 4: Dry Run Deployment

**ALWAYS do a dry run first:**

```bash
# Simulate deployment (doesn't broadcast)
forge script script/DeployBaseMainnet.s.sol \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --slow \
  --legacy

# Review the simulation output carefully!
```

---

## Step 5: Deploy to Mainnet

**⚠️ THIS WILL SPEND REAL ETH**

```bash
# Deploy contracts to Base Mainnet
forge script script/DeployBaseMainnet.s.sol \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  --slow \
  --legacy

# IMPORTANT: Save the deployment output!
```

---

## Step 6: Save Deployment Information

After deployment, save the contract address:

```bash
# Create deployments file
echo "BASE_MAINNET_OPTIONS_PROTOCOL=0xYOUR_DEPLOYED_ADDRESS" >> deployments/base-mainnet.txt
echo "DEPLOYER=YOUR_DEPLOYER_ADDRESS" >> deployments/base-mainnet.txt
echo "DEPLOYMENT_TX=0xTRANSACTION_HASH" >> deployments/base-mainnet.txt
echo "BLOCK_NUMBER=XXXXX" >> deployments/base-mainnet.txt
echo "TIMESTAMP=$(date)" >> deployments/base-mainnet.txt
```

---

## Step 7: Verify Deployment

### Check on BaseScan

Visit: `https://basescan.org/address/YOUR_DEPLOYED_ADDRESS`

Verify:
- [ ] Contract shows verified source code
- [ ] Constructor arguments are correct
- [ ] No obvious issues in code

### Test Basic Functions

```bash
# Check contract is accessible
cast call YOUR_DEPLOYED_ADDRESS "name()(string)" --rpc-url https://mainnet.base.org

# Verify contract owner
cast call YOUR_DEPLOYED_ADDRESS "owner()(address)" --rpc-url https://mainnet.base.org
```

---

## Step 8: Update Application Configuration

### Update Backend `.env`

```bash
# Edit packages/backend/.env
CHAIN_ID=8453  # Base Mainnet
RPC_URL=https://mainnet.base.org
OPTIONS_PROTOCOL_ADDRESS=0xYOUR_DEPLOYED_MAINNET_ADDRESS
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913  # Base Mainnet USDC
NODE_ENV=production
```

### Update Frontend `.env`

```bash
# Edit packages/frontend/.env
VITE_CHAIN_ID=8453
VITE_RPC_URL=https://mainnet.base.org
VITE_OPTIONS_PROTOCOL_ADDRESS=0xYOUR_DEPLOYED_MAINNET_ADDRESS
VITE_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

---

## Step 9: Post-Deployment Testing

### Test on Mainnet (with small amounts!)

1. **Connect to Mainnet** using your frontend
2. **Test with minimal USDC** (e.g., $1-10 USDC)
3. **Verify all functions work**:
   - Create profile with small amount
   - Create offer
   - Take option
   - Settle option

### Monitor Contract

- Watch for transactions on BaseScan
- Monitor for any errors or reverts
- Check gas usage is reasonable

---

## Step 10: Security Measures

### After Deployment

- [ ] **Transfer deployer funds** to secure cold wallet
- [ ] **Revoke unnecessary permissions** on deployer account
- [ ] **Set up contract monitoring** (e.g., Defender, Tenderly)
- [ ] **Document all contract addresses** in secure location
- [ ] **Update documentation** with mainnet addresses
- [ ] **Announce deployment** to users (if applicable)

---

## Important Addresses - Base Mainnet

| Contract | Address |
|----------|---------|
| **USDC** | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| **Pyth Oracle** | `0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a` |
| **Chain ID** | `8453` |

---

## Gas Costs Estimate

Expected gas costs for deployment on Base Mainnet:
- Contract deployment: ~0.02-0.04 ETH
- Verification: Free
- Initial setup transactions: ~0.01 ETH
- **Total estimate: ~0.05 ETH**

Current gas price can be checked at: https://basescan.org/gastracker

---

## Rollback Plan

If something goes wrong:

1. **DO NOT PANIC**
2. **Do not send more transactions** if there's an issue
3. **Document the problem** (transaction hash, error message)
4. **Contact support** or review contract code
5. **Have funds ready** for emergency actions if needed

---

## Production Checklist

Before going live with real users:

- [ ] Contracts audited by professional auditor
- [ ] All tests passing
- [ ] Integration tests on mainnet fork
- [ ] Emergency pause mechanism tested
- [ ] Admin keys properly secured
- [ ] Monitoring and alerting set up
- [ ] Insurance/bug bounty program considered
- [ ] Legal compliance reviewed
- [ ] Terms of service prepared
- [ ] User documentation complete

---

## ⚠️ Final Warnings

1. **Mainnet = Real Money** - Triple check everything
2. **No Undo Button** - Transactions are permanent
3. **Start Small** - Test with minimal amounts first
4. **Audit First** - Get professional security audit before launch
5. **Monitor Actively** - Watch contract activity closely

---

## Need Help?

- Base Discord: https://discord.gg/buildonbase
- Foundry Docs: https://book.getfoundry.sh/
- Base Docs: https://docs.base.org/

---

**Remember: Once deployed to mainnet, contracts are immutable. Double-check everything!**
