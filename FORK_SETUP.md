# Base Mainnet Fork Development Setup

This guide will help you run a local Base mainnet fork for development and testing.

## Prerequisites

- Foundry (forge, anvil, cast)
- Node.js and npm
- PostgreSQL (for backend)

## Quick Start

### 1. Setup Environment

```bash
# Copy .env.example to .env if you haven't already
cp .env.example .env

# Edit .env and set your BASE_RPC_URL (Alchemy, Infura, or public RPC)
# Example: BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

### 2. Start Base Mainnet Fork

**Option A: Using the setup script**
```bash
./setup-fork.sh
```

**Option B: Using npm script**
```bash
npm run fork
```

**Option C: Manual anvil command**
```bash
anvil --fork-url $BASE_RPC_URL --chain-id 8453 --host 0.0.0.0
```

This starts a local fork at `http://127.0.0.1:8545` with:
- Chain ID: 8453 (Base mainnet)
- 10 test accounts with 10,000 ETH each
- All Base mainnet state and contracts

### 3. Deploy Contracts to Fork

In a new terminal:

```bash
# Deploy OptionsProtocolGasless contract
npm run fork:deploy

# This will create .env.local with deployment addresses
source .env.local
```

### 4. Start Development Environment

```bash
# Start backend and frontend (fork should already be running)
npm run dev:backend  # Terminal 2
npm run dev:frontend # Terminal 3
```

Or all at once:
```bash
npm run dev  # Starts fork + backend + frontend
```

## Test Accounts

Anvil provides 10 funded test accounts. The first one is used by default:

```
Address:     0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
Balance:     10000 ETH
```

## Contract Addresses (Base Mainnet - Available on Fork)

These contracts are already deployed on Base mainnet and available in your fork:

```
USDC:           0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
WETH:           0x4200000000000000000000000000000000000006
Uniswap Router: 0x2626664c2603336E57B271c5C0b26F421741e481
Pyth Oracle:    0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a
```

## Using the Fork

### Get Test USDC

Since you're forked from mainnet, you can:

**Option 1: Impersonate a whale address**
```bash
cast rpc anvil_impersonateAccount 0x<USDC_WHALE_ADDRESS>
cast send 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  "transfer(address,uint256)" \
  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
  1000000000 \
  --from 0x<USDC_WHALE_ADDRESS> \
  --unlocked
```

**Option 2: Set balance directly (easier)**
```bash
# Set USDC balance for test account
cast rpc anvil_setBalance 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 0x56BC75E2D63100000
```

### Testing Transactions

All transactions on the fork are free and instant:
- No real ETH needed
- Instant block mining
- Can manipulate state with `anvil_*` RPC methods

### Reset Fork State

```bash
# Reset to original fork point
cast rpc anvil_reset --rpc-url http://127.0.0.1:8545
```

## Testing Gasless Transactions

### 1. Create Option Offer (Writer)

```typescript
// Writer signs offer (EIP-712)
const offer = {
  writer: writerAddress,
  underlying: WETH_ADDRESS,
  collateralAmount: parseEther("1"),
  stablecoin: USDC_ADDRESS,
  isCall: true,
  premiumPerDay: parseUnits("10", 6), // $10/day
  minDuration: 1,
  maxDuration: 30,
  minFillAmount: parseEther("0.1"),
  deadline: Math.floor(Date.now() / 1000) + 86400,
  configHash: WETH_CONFIG_HASH
};

const signature = await writer._signTypedData(domain, types, offer);
```

### 2. Take Option (Taker - Gasless)

```typescript
// Taker signs EIP-3009 payment authorization
const premium = calculatePremium(offer, duration, fillAmount);
const totalPayment = premium + 1_000000; // premium + $1 fee

const paymentAuth = await signEIP3009Authorization(
  USDC_ADDRESS,
  totalPayment,
  protocolAddress,
  nonce
);

// Backend relayer submits transaction
await protocol.takeOptionGasless(
  offer,
  signature,
  fillAmount,
  duration,
  paymentAuth
);
```

## Troubleshooting

### Fork fails to start
- Check your `BASE_RPC_URL` is valid
- Try using a different RPC provider (Alchemy, QuickNode)
- Check your internet connection

### Deployment fails
- Ensure anvil is running
- Check you have enough balance in test account
- Verify all contract dependencies are installed: `forge install`

### Backend can't connect to fork
- Check `FORK_RPC_URL=http://127.0.0.1:8545` in `.env`
- Ensure anvil is running with `--host 0.0.0.0`

## Advanced Usage

### Fork from specific block
```bash
npm run fork -- --fork-block-number 12345678
```

### Mine blocks manually
```bash
cast rpc evm_mine --rpc-url http://127.0.0.1:8545
```

### Set block timestamp
```bash
cast rpc evm_setNextBlockTimestamp 1234567890 --rpc-url http://127.0.0.1:8545
```

### Impersonate any address
```bash
cast rpc anvil_impersonateAccount 0x<ADDRESS>
# Now you can send transactions from this address
```

## Production vs Fork

| Feature | Fork | Base Mainnet |
|---------|------|--------------|
| Cost | Free | Real ETH for gas |
| Speed | Instant | ~2 seconds |
| State | Can reset | Permanent |
| Debugging | Full access | Limited |
| Testing | Safe | Risky |

## Next Steps

After testing on fork:
1. Deploy to Base Sepolia testnet: `npm run deploy:testnet`
2. Test with real testnet funds
3. Deploy to Base mainnet: `npm run deploy:mainnet`
