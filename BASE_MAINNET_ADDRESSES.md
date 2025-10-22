# Base Mainnet Production Addresses

**Network**: Base Mainnet
**Chain ID**: 8453
**RPC URL**: https://mainnet.base.org
**Explorer**: https://basescan.org/

---

## Protocol Infrastructure

### Core DeFi Protocols

| Protocol | Address | Purpose |
|----------|---------|---------|
| **USDC** | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | Main collateral token |
| **WETH** | `0x4200000000000000000000000000000000000006` | Wrapped ETH |
| **Uniswap V3 Router** | `0x2626664c2603336E57B271c5C0b26F421741e481` | SwapRouter02 for swaps |
| **Pyth Network** | `0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a` | Price oracle |

---

## Your Deployment

### Volvi Options Protocol

| Contract | Address | Status |
|----------|---------|--------|
| **OptionsProtocol** | TBD (after deployment) | 🔜 Pending |

**After deployment, this address will be saved in `deployments/base-mainnet.txt`**

---

## Vincent Ability IPFS CIDs

These are the same across all networks (testnet and mainnet):

| Ability | IPFS CID |
|---------|----------|
| **Create Profile** | `QmWKSV282p3NCWn7WaPW43KtrPqgAtzTK7A2DGYTTdXh15` |
| **Create Offer** | `QmeuzKma2HrfGyMpvZj19TY15E3JJe4UjS4heYNdwwCQKE` |
| **Take Option** | `Qma41tK42VBM5fjqFKzdktzb7yLjZGGjjJsi1VK6ewnR1L` |
| **Settle Option** | `QmWFd4yeYpat1ZL69KKutkCfPbMnKF6WP4WmFx17uGX1eM` |

---

## Network Comparison

### Base Sepolia (Testnet) vs Base Mainnet

| Item | Base Sepolia (Testnet) | Base Mainnet (Production) |
|------|------------------------|---------------------------|
| **Chain ID** | 84532 | 8453 |
| **RPC URL** | https://sepolia.base.org | https://mainnet.base.org |
| **Explorer** | https://sepolia.basescan.org | https://basescan.org |
| **USDC** | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| **Your Contract** | `0xD7AFfB2B3303e9Cb44C9d9aFA6bD938200b3C8F2` | TBD (after deployment) |
| **Purpose** | Testing | Production |

---

## Configuration Files

### Backend .env (Mainnet)

```bash
# Blockchain Configuration (Base Mainnet)
CHAIN_ID=8453
RPC_URL=https://mainnet.base.org
OPTIONS_PROTOCOL_ADDRESS=0x...  # From deployments/base-mainnet.txt
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Vincent Configuration (same as testnet)
VINCENT_APP_ID=your_app_id
DELEGATEE_PRIVATE_KEY=0x...
ALLOWED_AUDIENCE=https://yourdomain.com

# Vincent Ability CIDs (same as testnet)
CREATE_PROFILE_ABILITY_CID=QmWKSV282p3NCWn7WaPW43KtrPqgAtzTK7A2DGYTTdXh15
CREATE_OFFER_ABILITY_CID=QmeuzKma2HrfGyMpvZj19TY15E3JJe4UjS4heYNdwwCQKE
TAKE_OPTION_ABILITY_CID=Qma41tK42VBM5fjqFKzdktzb7yLjZGGjjJsi1VK6ewnR1L
SETTLE_OPTION_ABILITY_CID=QmWFd4yeYpat1ZL69KKutkCfPbMnKF6WP4WmFx17uGX1eM

# Production Settings
NODE_ENV=production
LOG_LEVEL=info
PORT=3001
```

### Frontend .env (Mainnet)

```bash
# Blockchain Configuration (Base Mainnet)
VITE_CHAIN_ID=8453
VITE_RPC_URL=https://mainnet.base.org
VITE_OPTIONS_PROTOCOL_ADDRESS=0x...  # From deployments/base-mainnet.txt

# Vincent Configuration
VITE_VINCENT_APP_ID=your_app_id
VITE_REDIRECT_URI=https://yourdomain.com/callback

# Backend API
VITE_BACKEND_URL=https://api.yourdomain.com

# Environment
VITE_ENV=production
```

---

## Useful Links

### Base Network
- **Official Site**: https://base.org/
- **Bridge**: https://bridge.base.org/
- **Docs**: https://docs.base.org/

### Block Explorers
- **BaseScan**: https://basescan.org/
- **Blockscout**: https://base.blockscout.com/

### Price Oracles
- **Pyth Network**: https://pyth.network/
- **Pyth Base Mainnet**: https://pyth.network/price-feeds?cluster=base-mainnet

### DeFi Protocols
- **Uniswap V3**: https://app.uniswap.org/
- **USDC Info**: https://www.circle.com/en/usdc

### Development Tools
- **Foundry**: https://book.getfoundry.sh/
- **Vincent Dashboard**: https://dashboard.heyvincent.ai/
- **Tenderly**: https://tenderly.co/ (monitoring)

---

## Quick Commands

### Check Balances

```bash
# Check ETH balance
cast balance <ADDRESS> --rpc-url https://mainnet.base.org

# Check USDC balance
cast call 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  "balanceOf(address)(uint256)" <ADDRESS> \
  --rpc-url https://mainnet.base.org
```

### Verify Contract

```bash
# After deployment
forge verify-contract <CONTRACT_ADDRESS> \
  src/OptionsProtocol.sol:OptionsProtocol \
  --chain base \
  --watch \
  --constructor-args $(cast abi-encode \
    "constructor(address,address,address)" \
    0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a \
    0x2626664c2603336E57B271c5C0b26F421741e481 \
    0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
```

### Read Contract

```bash
CONTRACT_ADDRESS="0x..."  # Your deployed contract

# Get USDC address
cast call $CONTRACT_ADDRESS "usdc()(address)" \
  --rpc-url https://mainnet.base.org

# Get Pyth address
cast call $CONTRACT_ADDRESS "pyth()(address)" \
  --rpc-url https://mainnet.base.org

# Get Uniswap router address
cast call $CONTRACT_ADDRESS "uniswapRouter()(address)" \
  --rpc-url https://mainnet.base.org
```

---

## Gas Price Monitoring

Base typically has very low gas fees. Check current gas price:

```bash
cast gas-price --rpc-url https://mainnet.base.org

# Convert to Gwei
cast --to-unit $(cast gas-price --rpc-url https://mainnet.base.org) gwei
```

Typical gas prices on Base:
- **Low**: < 0.001 Gwei
- **Average**: 0.001 - 0.01 Gwei
- **High**: > 0.01 Gwei

Deployment typically costs: **0.03 - 0.05 ETH** on Base Mainnet.

---

## Security Notes

1. **Contract Immutability**: Once deployed, contracts CANNOT be changed
2. **Test First**: Always test on Base Sepolia before mainnet
3. **Start Small**: Test with small USDC amounts ($10-50) first
4. **Monitor**: Set up monitoring with Tenderly or Defender
5. **Backup Keys**: Keep secure backups of all private keys
6. **Audit**: Consider professional security audit before large deployments

---

**Last Updated**: 2025-10-22
**Version**: 1.0.0
