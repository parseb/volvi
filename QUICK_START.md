# Quick Start Guide

## 🚀 Available Start Commands

### Local Development (Anvil Fork)
```bash
npm start
# or
npm run dev
```
**Uses:**
- Local Anvil fork of Base mainnet
- Contract deployed at local address
- Test accounts pre-funded with WETH & USDC
- Fast iteration, no gas costs

**Best for:** Development, testing, debugging

---

### Sepolia Testnet
```bash
npm run start:sepolia
```
**Uses:**
- Sepolia testnet (Ethereum)
- Contract: `0xD7AFfB2B3303e9Cb44C9d9aFA6bD938200b3C8F2`
- Requires Sepolia ETH for gas
- Real testnet environment

**Best for:** Testing with real testnet conditions

**Setup:**
1. Get Sepolia ETH from faucet: https://sepoliafaucet.com/
2. Set `NEXT_PUBLIC_CHAIN_ID=11155111` in frontend/.env
3. Set `NEXT_PUBLIC_PROTOCOL_ADDRESS=0xD7AFfB2B3303e9Cb44C9d9aFA6bD938200b3C8F2`

---

### Base Sepolia Testnet (Gasless Features)
```bash
npm run start:base-sepolia
```
**Uses:**
- Base Sepolia testnet
- OptionsProtocolGasless: `0xD7AFfB2B3303e9Cb44C9d9aFA6bD938200b3C8F2`
- CoW Protocol integration
- Gasless settlement with EIP-1271

**Best for:** Testing CoW Protocol gasless settlement

**Setup:**
1. Get Base Sepolia ETH from faucet: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
2. Set `NEXT_PUBLIC_CHAIN_ID=84532` in frontend/.env
3. Set `NEXT_PUBLIC_PROTOCOL_ADDRESS=0xD7AFfB2B3303e9Cb44C9d9aFA6bD938200b3C8F2`

---

## 🌐 Network Configuration

### Supported Networks

| Network | Chain ID | Contract Address | Type |
|---------|----------|------------------|------|
| Base Fork | 123999 | Local deployment | Development |
| Sepolia | 11155111 | 0xD7AFfB2B3303e9Cb44C9d9aFA6bD938200b3C8F2 | Testnet |
| Base Sepolia | 84532 | 0xD7AFfB2B3303e9Cb44C9d9aFA6bD938200b3C8F2 | Testnet (Gasless) |
| Base Mainnet | 8453 | Not deployed | Production |

### Environment Variables

**Frontend (.env.local):**
```bash
NEXT_PUBLIC_REOWN_PROJECT_ID=your_reown_project_id
NEXT_PUBLIC_CHAIN_ID=84532  # Base Sepolia
NEXT_PUBLIC_PROTOCOL_ADDRESS=0xD7AFfB2B3303e9Cb44C9d9aFA6bD938200b3C8F2
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Backend (.env):**
```bash
PORT=3001
```

**Root (.env):**
```bash
# RPC URLs
BASE_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# Deployment
DEPLOYER_PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=your_key_here
```

---

## 🛠️ Development Workflow

### 1. First Time Setup
```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

# Build contracts
npm run build:contracts
```

### 2. Local Development
```bash
# Terminal 1: Start everything (fork + backend + frontend)
npm start

# Or separately:
# Terminal 1: Start Anvil fork
npm run fork

# Terminal 2: Deploy to fork and fund accounts
npm run fork:deploy
npm run fork:fund

# Terminal 3: Start backend
npm run dev:backend

# Terminal 4: Start frontend
npm run dev:frontend
```

### 3. Testnet Development
```bash
# Deploy to Sepolia
forge script script/DeploySepolia.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast -vv

# Or Base Sepolia (gasless)
forge script script/DeployBaseSepoliaGasless.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast -vv

# Start backend + frontend
npm run start:sepolia
# or
npm run start:base-sepolia
```

---

## 📝 Test Accounts (Local Fork Only)

When running `npm start`, these accounts are pre-funded:

```
Account 1: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
Balance: 1000 WETH, 1000 USDC

Account 2: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
Balance: 1000 WETH, 1000 USDC

Account 3: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
Balance: 1000 WETH, 1000 USDC

Account 4: 0x90F79bf6EB2c4f870365E785982E1f101E93b906
Private Key: 0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a
Balance: 1000 WETH, 1000 USDC

Account 5: 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
Private Key: 0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba
Balance: 1000 WETH, 1000 USDC
```

Import these into MetaMask for testing.

---

## 🧪 Testing the Protocol

### Basic Flow (Local)

1. **Start everything:**
   ```bash
   npm start
   ```

2. **Connect wallet** to http://localhost:3000
   - Switch to Base Fork (Chain ID 123999)
   - Import test account from above

3. **Create an offer** (as Writer/Maker):
   - Open "Write Options" sidebar
   - Select WETH token
   - Set collateral amount (e.g., 1 WETH)
   - Set premium (e.g., 0.01 WETH per day)
   - Choose Call or Put
   - Approve WETH → Sign offer (gasless!)

4. **Take an option** (as Taker):
   - Switch to different account
   - Find offer in Orderbook
   - Click "Take Option"
   - Select duration (e.g., 7 days)
   - Sign gasless payment authorization
   - Confirm transaction

5. **View position:**
   - Go to Dashboard
   - See your active positions with P&L
   - Wait for expiry or close early

6. **Settle option:**
   - Click "Settle" button
   - Follow settlement flow
   - Receive payout in USDC

---

## 🌟 Advanced Features

### CoW Protocol Gasless Settlement (Base Sepolia Only)

1. Deploy gasless contract on Base Sepolia
2. Create and take options
3. When settling:
   - Frontend shows CoW swap matchmaking status
   - Real-time polling of batch auction
   - Settlement executes automatically
   - Zero gas for taker!

**Note:** Backend endpoints for CoW settlement are not yet implemented. Manual settlement still works.

---

## 🔧 Troubleshooting

### "Unknown command: start:sepolia"
Use `npm run start:sepolia` (not `npm start:sepolia`)

### Backend crashes on Pyth import
Fixed in latest version - uses Hermes HTTP API instead of SDK

### Orderbook shows "No offers available"
- Check backend is running (port 3001)
- Verify offers were created successfully
- Check browser console for API errors

### Transaction fails with "Insufficient balance"
- Check token balance in wallet
- Ensure approval transaction completed
- For testnets, get tokens from faucets

### Cannot connect wallet
- Check NEXT_PUBLIC_REOWN_PROJECT_ID is set
- Get free project ID from: https://cloud.reown.com/
- Clear browser cache and reconnect

---

## 📦 Build & Deploy

### Build Everything
```bash
npm run build
```

### Deploy Contracts
```bash
# Sepolia
forge script script/DeploySepolia.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify

# Base Sepolia (gasless)
forge script script/DeployBaseSepoliaGasless.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify

# Base Mainnet (when ready)
forge script script/Deploy.s.sol --rpc-url $BASE_RPC_URL --broadcast --verify
```

### Run Tests
```bash
# Smart contract tests
npm test

# Verbose output
npm run test:verbose

# Fork tests
npm run test:fork
```

---

## 🆘 Need Help?

- Check [PROTOCOL_STATUS.md](PROTOCOL_STATUS.md) for feature completeness
- Check [COW_INTEGRATION_SUMMARY.md](COW_INTEGRATION_SUMMARY.md) for CoW details
- Review smart contracts in `src/`
- Check backend API in `backend/src/routes.ts`
- Frontend components in `frontend/components/`

---

## 🎯 Quick Command Reference

| Command | Purpose |
|---------|---------|
| `npm start` | Local development (fork + backend + frontend) |
| `npm run start:sepolia` | Sepolia testnet development |
| `npm run start:base-sepolia` | Base Sepolia with gasless features |
| `npm run fork` | Start Anvil fork only |
| `npm run dev:backend` | Start backend API only |
| `npm run dev:frontend` | Start frontend only |
| `npm run build` | Build all (contracts + backend + frontend) |
| `npm test` | Run smart contract tests |
| `npm run fork:deploy` | Deploy to local fork |
| `npm run fork:fund` | Fund test accounts on fork |

---

Enjoy building with the Options Protocol! 🚀
