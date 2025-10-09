# Quick Start Guide

## One-Command Startup ⚡

```bash
npm start
```

This will:
1. ✅ Start Base mainnet fork (port 8545)
2. ✅ Deploy OptionsProtocolGasless contract
3. ✅ Fund test accounts with USDC & WETH
4. ✅ Configure WETH with Pyth oracle
5. ✅ Pre-approve tokens for convenience
6. ✅ Save addresses to `.env.local`
7. ✅ Start Backend (port 3001)
8. ✅ Start Frontend (port 3000)

**That's it!** Open http://localhost:3000 and start trading.

## First Time Setup

### 1. Configure Environment
```bash
cp .env.example .env
nano .env  # Set BASE_RPC_URL
```

Use public RPC or get API key from:
- Alchemy: https://www.alchemy.com/
- Infura: https://www.infura.io/

```bash
BASE_RPC_URL=https://mainnet.base.org
# or
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

### 2. Start Everything
```bash
npm start
```

Wait for "ALL SERVICES RUNNING!" message showing:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Fork: http://127.0.0.1:8545

### 3. Connect Wallet

Open http://localhost:3000

**Add Network to MetaMask:**
- Network Name: `Base Fork`
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `8453`
- Currency: `ETH`

**Import Test Accounts:**

Account #1 (Deployer):
```
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

Account #2 (Writer - has WETH):
```
0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

Account #3 (Taker - has USDC):
```
0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
```

## Test the Gasless Flow

### As Writer (LP)
1. Switch to Writer account in MetaMask
2. Create option offer
3. Sign EIP-712 message (no gas!)
4. Offer appears in orderbook

### As Taker
1. Switch to Taker account
2. Browse options
3. Click "Buy Option"
4. Sign single EIP-3009 payment (premium + $1 fee)
5. Backend submits transaction
6. Receive option NFT

## Available Commands

```bash
# Start everything (recommended)
npm start                 # Fork + Deploy + Fund + Backend + Frontend

# Start services separately (if needed)
npm run dev:backend       # Backend only (port 3001)
npm run dev:frontend      # Frontend only (port 3000)
npm run fork              # Fork only (port 8545)

# Deploy & manage
npm run fork:deploy       # Deploy contracts to running fork
npm run fork:fund         # Fund test accounts
npm run fork:setup        # Deploy + fund (fork must be running)

# Build
npm run build            # Build all
npm run build:contracts  # Build Solidity
npm run build:backend    # Build backend
npm run build:frontend   # Build frontend

# Test
npm run test             # Run Forge tests
npm run test:fork        # Test against fork
```

## Useful Cast Commands

```bash
# Check balances
cast balance 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url http://127.0.0.1:8545

# Check USDC balance
cast call 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  "balanceOf(address)(uint256)" \
  0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
  --rpc-url http://127.0.0.1:8545

# Fast forward time (1 day)
cast rpc evm_increaseTime 86400 --rpc-url http://127.0.0.1:8545
cast rpc evm_mine --rpc-url http://127.0.0.1:8545

# Reset fork
cast rpc anvil_reset --rpc-url http://127.0.0.1:8545
```

## Troubleshooting

**"Port 8545 already in use"**
```bash
pkill -f anvil
# or
lsof -ti:8545 | xargs kill -9
```

**"BASE_RPC_URL not set"**
```bash
nano .env  # Add BASE_RPC_URL
```

**"Deployment failed"**
```bash
# Check fork is running
curl http://127.0.0.1:8545

# Check logs
tail -f /tmp/anvil.log
```

**Backend won't start**
```bash
# Check PostgreSQL
sudo systemctl status postgresql

# Create database
psql -U postgres -c "CREATE DATABASE options_protocol;"
```

**No funds in test accounts**
```bash
# The fork pulls from mainnet - whale addresses might have changed
# Update COINBASE_USDC and WETH_HOLDER in scripts/start-dev.sh
```

## What's Running

After `npm start`, all services run in one terminal:

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3000 | UI - **Open this!** |
| **Backend** | http://localhost:3001 | API server |
| **Fork** | http://127.0.0.1:8545 | Base mainnet fork |

**Ctrl+C stops everything** - fork, backend, and frontend all shut down cleanly.

## Environment Files

**`.env`** - Your configuration (committed to git)
```bash
BASE_RPC_URL=https://mainnet.base.org
```

**`.env.local`** - Auto-generated (NOT committed)
```bash
PROTOCOL_ADDRESS=0x...
DEPLOYER_ADDRESS=0x...
WRITER_ADDRESS=0x...
TAKER_ADDRESS=0x...
```

Always `source .env.local` before starting backend!

## Next Steps

1. ✅ Test option creation flow
2. ✅ Test gasless transactions
3. ✅ Test settlement
4. Deploy to Base Sepolia testnet
5. Public testing
6. Audit
7. Deploy to Base mainnet

## Resources

- [Full Fork Documentation](./FORK_SETUP.md)
- [Detailed Setup Guide](./QUICKSTART.md)
- [Architecture Overview](./SETUP_SUMMARY.md)

## Support

Having issues?
1. Check logs: `tail -f /tmp/anvil.log`
2. Verify fork: `cast chain-id --rpc-url http://127.0.0.1:8545`
3. Check balances with cast commands above
4. Reset and try again: `cast rpc anvil_reset`

---

**Ready to build!** 🚀

Run `npm start` to begin.
