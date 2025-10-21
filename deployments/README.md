# Deployments Directory

This directory stores deployment artifacts and contract addresses for different networks.

## Purpose

After deploying smart contracts, deployment scripts will automatically save:
- Contract addresses
- Network configuration
- Deployment timestamps
- Transaction hashes

## Files Generated

When you deploy contracts, the following files will be created:

```
deployments/
├── .gitkeep                    # Keeps directory in git
├── README.md                   # This file
├── base-sepolia.txt           # Base Sepolia testnet deployment (ignored)
├── base-sepolia-gasless.txt   # Base Sepolia gasless variant (ignored)
├── base-mainnet.txt           # Base mainnet deployment (ignored)
└── ability-cids.txt           # IPFS CIDs for abilities (ignored)
```

## Security

⚠️ **All `.txt` files in this directory are git-ignored** (except `.gitkeep`)

These files may contain:
- Contract addresses (public but sensitive)
- Deployment configuration
- Private keys or mnemonic references (if accidentally included)

**Never commit actual deployment artifacts to git.**

## Usage

### After Smart Contract Deployment

The deployment scripts automatically create these files:

```bash
# Deploy to Base Sepolia
forge script script/DeployBaseSepoliaGasless.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast

# Check deployment info
cat deployments/base-sepolia-gasless.txt
```

### Manually Creating Files

If needed, you can manually create deployment tracking files:

```bash
# Example: base-sepolia-gasless.txt
echo "BASE_SEPOLIA_PROTOCOL_GASLESS=0x..." > deployments/base-sepolia-gasless.txt
echo "BASE_SEPOLIA_USDC=0x036CbD53842c5426634e7929541eC2318f3dCF7e" >> deployments/base-sepolia-gasless.txt
```

### Tracking IPFS CIDs

After publishing abilities to IPFS:

```bash
# Create ability-cids.txt
cat > deployments/ability-cids.txt <<EOF
CREATE_PROFILE_CID=Qm...
CREATE_OFFER_CID=Qm...
TAKE_OPTION_CID=Qm...
SETTLE_OPTION_CID=Qm...
EOF
```

## Environment Variables

To use deployment info in your application:

```bash
# Load deployment info
source deployments/base-sepolia-gasless.txt

# Set in backend .env
echo "OPTIONS_PROTOCOL_ADDRESS=$BASE_SEPOLIA_PROTOCOL_GASLESS" >> packages/backend/.env

# Set in frontend .env
echo "VITE_OPTIONS_PROTOCOL_ADDRESS=$BASE_SEPOLIA_PROTOCOL_GASLESS" >> packages/frontend/.env
```

## Production Deployment

For production deployments:

1. Deploy contracts
2. Save deployment info to this directory (git-ignored)
3. Manually update `.env` files with contract addresses
4. Store deployment info securely (1Password, AWS Secrets Manager, etc.)
5. Document deployment in project documentation

## Backup

Even though these files are git-ignored, **back them up securely**:

- Copy to secure password manager
- Store in encrypted cloud storage
- Keep offline backup
- Share with team via secure channels

## File Format

Deployment files use simple KEY=VALUE format:

```bash
# Network info
CHAIN_ID=84532
NETWORK=base-sepolia

# Contract addresses
PROTOCOL_ADDRESS=0x...
USDC_ADDRESS=0x...
PYTH_ADDRESS=0x...

# Deployment metadata
DEPLOYED_AT=2025-10-21T12:00:00Z
DEPLOYER=0x...
TX_HASH=0x...
BLOCK_NUMBER=12345678
```

## Troubleshooting

### File Not Created

If deployment file is not created automatically:
- Check deployment script succeeded
- Verify write permissions on `deployments/` directory
- Check Foundry script output for errors

### Contract Address Not Found

If you need to find a contract address:
```bash
# Check Foundry broadcast artifacts
ls -la broadcast/

# Or check BaseScan with deployer address
# https://sepolia.base.org/address/YOUR_DEPLOYER_ADDRESS
```

## Related Documentation

- [DEPLOYMENT_GUIDE.md](../docs/DEPLOYMENT_GUIDE.md) - Complete deployment instructions
- [PHASE5_PLAN.md](../docs/PHASE5_PLAN.md) - Phase 5 deployment plan
- Foundry deployment scripts in `script/` directory

---

**Important**: This directory exists to help you track deployments locally. All actual deployment artifacts are git-ignored for security.
