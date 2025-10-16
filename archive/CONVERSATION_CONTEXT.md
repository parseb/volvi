# Options Protocol - Development Conversation Context

## Project Overview

A decentralized options protocol for ERC-20 tokens with signature-based orderbook, partial fills, and multi-chain support.

## Initial Requirements

### Core Concept
- Orderbook protocol where the middle is stored at `abi.encode(tokenaddress)`
- Order struct hashes stored on either side with EIP-712 signatures
- Abstract accounts/EIP-7702 for programmable orders
- Market making accounts can submit orders that execute arbitration logic (flashloans, multi-asset swaps)

### Key Features Requested
1. **Signature-based Orderbook**: Off-chain orders, on-chain execution
2. **Partial Fills**: No nonces, track filled amounts
3. **Flexible Premium Model**: Writers set premium/day, takers choose duration and strike
4. **Settlement**: ZAAM initially considered, then pivoted to direct settlement
5. **Collateral**: Locked when option is taken (not when offer is signed)
6. **Price Oracle**: Pyth primary, Uniswap V3 fallback
7. **Cash Settlement**: Stablecoin-based, protocol takes 0.1% fee on profitable options

## Design Decisions Made

### 1. Architecture Choices

**Orderbook Storage** (Decision: Option A - Off-chain with on-chain optional)
- Orders kept off-chain by default
- Broadcaster role can optionally store on-chain
- `broadcastOrder(hash, bool storeOnChain, offer)` function
- Events emitted for indexing

**Collateral Model**
- Writers sign offers with EIP-712 (no collateral locked)
- Taker execution pulls collateral via `transferFrom`
- Frontend validates: signature + balance + approval
- Strike price set at execution time from oracle

**Partial Fills Implementation**
- `filledAmounts[offerHash]` mapping tracks cumulative fills
- `offerActiveOptions[offerHash]` stores array of active option NFT IDs
- No nonces needed - allowance depletion naturally limits fills
- Writers can cancel by revoking approval

### 2. Settlement & Pricing

**Oracle Hierarchy:**
1. Pyth Network (primary)
2. Uniswap V3 TWAP (fallback)
3. Revert if neither available

**Conservative Pricing:**
- Use confidence intervals for safety
- Calls: `settlementPrice = currentPrice - confidence` (lower bound)
- Puts: `settlementPrice = currentPrice + confidence` (upper bound)

**Settlement Types:**
- **Calls**: Keep collateral, sell only if profitable
- **Puts**: Sell to stablecoin immediately, return if unprofitable
- Anyone can settle expired options (no incentive needed - writer wants liquidity back)

### 3. Token Configuration

**Default Config:**
- Stablecoin: USDC
- Swap Venue: Uniswap V3
- Pool Fee: 0.3% (3000)
- Min Unit: 1.0 token
- Minimum Premium: 1 USDC

**Token-Specific Configs:**
- Per-token customization via `setTokenConfig()`
- Config hash stored in offers and options
- Emergency override mechanism for critical updates
- Hooks: pre/post creation, settlement

**Initially Configured Tokens:**
- WETH (Wrapped Ether)
- WBTC (Wrapped Bitcoin)
- USDC (for native USDC options)

### 4. Frontend/Backend Design

**Backend Approach** (Decision: Option A - Minimal viable)
- Express API with in-memory storage
- Basic endpoints for orderbook display
- No PostgreSQL initially (easy migration path to GunDB/PostgreSQL)
- Direct RPC calls for blockchain data

**Frontend Pages** (All 3 essential):
1. **Landing Page**: Orderbook with integrated taker UI
2. **Writer Interface**: Sidebar with tabs (Writer/Taker)
3. **Portfolio Page**: Active positions with P&L

**Broadcaster Role** (Decision: Option C - Centralized initially)
- Backend service is broadcaster (contract role)
- Default: deployer has broadcaster role
- Centralized initially, can approve other addresses later
- Deployer manages broadcaster permissions

**Deployment Strategy** (Decision: Option B - Incremental)
- Start with frontend + contracts
- Add backend for enhanced UX
- Direct wallet interactions fallback

### 5. Technical Implementation

**Smart Contract Features:**
- ERC-721 for transferable options
- EIP-712 typed signatures for offers
- Access control: ADMIN_ROLE, BROADCASTER_ROLE
- SafeERC20 for all token transfers
- Via-IR compilation for complex functions

**Storage Layout:**
```solidity
// Not using custom storage slots - too messy
// Using standard mappings instead:
mapping(bytes32 => TokenConfig) public tokenConfigs;
mapping(bytes32 => uint256) public filledAmounts;
mapping(bytes32 => OptionOffer) public storedOffers;
mapping(bytes32 => uint256[]) public offerActiveOptions;
mapping(uint256 => ActiveOption) public options;
```

**Event System:**
```solidity
event OrderBroadcast(bytes32 indexed offerHash, bool stored);
event OptionTaken(uint256 indexed tokenId, bytes32 indexed offerHash, ...);
event OptionSettled(uint256 indexed tokenId, uint256 profit, address settler);
```

## Implementation Phases

### Phase 1: MVP (Current - ~75% Complete)

**✅ Completed:**
1. Smart contracts with full functionality
2. Comprehensive test suite (12/12 passing)
3. Backend API with in-memory storage
4. Deployment scripts and configuration
5. Uniswap V3 oracle integration

**⏳ In Progress:**
6. Frontend with Reown AppKit
7. Orderbook UI components
8. Writer/Taker interfaces
9. Portfolio page

**Pending:**
10. Railway deployment
11. Multi-token configuration

### Phase 2: Future Enhancements

1. PostgreSQL or GunDB migration
2. Advanced indexer service
3. Portfolio analytics
4. Order history
5. Advanced filtering
6. Mobile responsive optimization

## Key Technical Details

### Offer Structure
```solidity
struct OptionOffer {
    address writer;
    address underlying;
    uint256 collateralAmount;
    address stablecoin;
    bool isCall;
    uint256 premiumPerDay;
    uint16 minDuration;      // e.g., 1 day
    uint16 maxDuration;      // e.g., 365 days
    uint256 minFillAmount;
    uint64 deadline;
    bytes32 configHash;
}
```

### Active Option Structure
```solidity
struct ActiveOption {
    uint256 tokenId;
    address writer;
    address underlying;
    uint256 collateralLocked;
    bool isCall;
    uint256 strikePrice;     // Set at execution from oracle
    uint64 startTime;
    uint64 expiryTime;
    bool settled;
    bytes32 configHash;
    bytes32 offerHash;
}
```

### API Endpoints
```
GET  /api/health
GET  /api/orderbook/:token?isCall=true&minDuration=7&maxDuration=30
POST /api/offers
GET  /api/offers/:offerHash
GET  /api/positions/:address
GET  /api/config/:token
GET  /api/options/:tokenId
```

### Orderbook Sorting
- Primary: `totalPremium = premiumPerDay * remainingAmount`
- Sort ascending (cheapest first)
- Filter: valid only (remaining > 0, not expired)

## Environment Configuration

### Required Variables
```bash
# Blockchain
BASE_RPC_URL=https://mainnet.base.org
CHAIN_ID=8453

# Contracts (Base Mainnet)
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
WETH_ADDRESS=0x4200000000000000000000000000000000000006
UNISWAP_V3_ROUTER=0x2626664c2603336E57B271c5C0b26F421741e481
PYTH_ADDRESS=0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a

# Pyth Price Feeds
PYTH_ETH_USD_FEED=0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace

# Deployment
DEPLOYER_PRIVATE_KEY=
BROADCASTER_PRIVATE_KEY=

# API
API_PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_REOWN_PROJECT_ID=
NEXT_PUBLIC_PROTOCOL_ADDRESS=
```

## Testing Strategy

### Happy Path Tests (All Passing ✅)
1. ✅ Take call option with premium payment
2. ✅ Take put option with immediate swap
3. ✅ Multiple partial fills of same offer
4. ✅ Profitable call settlement
5. ✅ Unprofitable call returns collateral
6. ✅ Profitable put settlement
7. ✅ Expired option settlement by anyone
8. ✅ Real-time P&L calculation
9. ✅ Duration validation
10. ✅ Minimum fill validation
11. ✅ Deadline validation
12. ✅ NFT transferability and settlement

### Test Approach
- Foundry for smart contract testing
- Mock contracts for Pyth, Uniswap, ERC20
- EIP-712 signature generation using `vm.sign`
- Event emission verification
- Gas optimization testing with `--gas-report`

## Security Considerations

### Implemented Safeguards
1. ✅ EIP-712 signature verification
2. ✅ SafeERC20 for token transfers
3. ✅ Reentrancy protection (CEI pattern)
4. ✅ Access control (role-based)
5. ✅ Conservative oracle pricing
6. ✅ Emergency override mechanism
7. ✅ Input validation (duration, amounts)

### Pending Audit Items
- Professional smart contract audit required
- Economic attack vector analysis
- Oracle manipulation scenarios
- MEV considerations
- Upgrade/migration strategy

## Deployment Checklist

### Pre-Deployment
- [ ] Configure WETH on Base mainnet
- [ ] Configure WBTC on Base mainnet
- [ ] Set up Pyth price feeds
- [ ] Deploy contracts to Base Sepolia (testnet)
- [ ] Test full flow on testnet
- [ ] Configure broadcaster address
- [ ] Set protocol fee collector

### Deployment
- [ ] Deploy to Base mainnet
- [ ] Verify contracts on Basescan
- [ ] Configure initial tokens (WETH, WBTC)
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Railway
- [ ] Configure environment variables
- [ ] Test end-to-end flow

### Post-Deployment
- [ ] Monitor initial transactions
- [ ] Set up error tracking
- [ ] Configure analytics
- [ ] Prepare documentation
- [ ] Community announcement

## Known Limitations & Future Work

### Current Limitations
1. In-memory storage (not persistent)
2. No advanced indexer (basic event listening only)
3. Simplified Uniswap V3 oracle (not full TWAP)
4. Centralized broadcaster
5. Limited token configurations

### Migration Path
1. **Storage**: In-memory → PostgreSQL or GunDB
2. **Indexer**: Basic events → Full indexer with historical data
3. **Oracle**: Simplified → Production TWAP implementation
4. **Broadcaster**: Centralized → Decentralized/permissionless
5. **Tokens**: Manual config → Community governance

## File Structure

```
options-protocol/
├── src/
│   ├── OptionsProtocol.sol (main contract)
│   ├── interfaces/
│   │   ├── IPyth.sol
│   │   ├── ITokenHook.sol
│   │   └── IPriceOracle.sol
│   └── libraries/
│       └── UniswapV3Oracle.sol
├── test/
│   ├── OptionsProtocol.t.sol
│   └── mocks/
│       ├── MockERC20.sol
│       ├── MockPyth.sol
│       └── MockSwapRouter.sol
├── script/
│   └── Deploy.s.sol
├── backend/
│   └── src/
│       ├── index.ts (main server)
│       ├── routes.ts (API endpoints)
│       ├── storage.ts (in-memory storage)
│       ├── contract.ts (blockchain interaction)
│       ├── config.ts
│       └── types.ts
├── frontend/
│   ├── app/ (Next.js 14 app router)
│   ├── components/
│   └── lib/
├── .env
├── foundry.toml
├── package.json
├── railway.json
├── railway.toml
├── README.md
├── IMPLEMENTATION_SUMMARY.md
├── PHASE1_COMPLETE.md
└── CONVERSATION_CONTEXT.md (this file)
```

## Decision Log

### Why No ZAAM?
Initially considered for settlement but decided on direct settlement because:
- Simpler implementation
- Lower gas costs
- Fewer dependencies
- Direct oracle integration
- Option can still include flashloan logic via hooks

### Why In-Memory Storage?
Chosen for MVP because:
- Fast development
- No database setup required
- Easy migration path
- Sufficient for initial testing
- Can add persistence later without major refactor

### Why Broadcaster Role?
Prevents spam and maintains orderbook quality:
- Controls which orders are indexed
- Can implement validation logic
- Allows gradual decentralization
- Deployer maintains control initially
- Can grant role to community later

### Why ERC-721 for Options?
Enables transferability and composability:
- Options can be traded on secondary markets
- Compatible with NFT infrastructure
- Easy P&L tracking
- Wallet integration
- Future DeFi integrations

## Common Patterns & Helpers

### Computing Offer Hash
```typescript
const offerHash = ethers.keccak256(
  ethers.AbiCoder.defaultAbiCoder().encode(
    ['address', 'address', 'uint256', 'address', 'bool', 'uint256', 'uint16', 'uint16', 'uint256', 'uint64', 'bytes32'],
    [writer, underlying, collateralAmount, stablecoin, isCall, premiumPerDay, minDuration, maxDuration, minFillAmount, deadline, configHash]
  )
);
```

### Signing Offer (EIP-712)
```typescript
const domain = {
  name: 'OptionsProtocol',
  version: '1',
  chainId: 8453,
  verifyingContract: protocolAddress
};

const types = {
  OptionOffer: [
    { name: 'writer', type: 'address' },
    { name: 'underlying', type: 'address' },
    // ... all fields
  ]
};

const signature = await signer.signTypedData(domain, types, offer);
```

### Calculating Premium
```typescript
const premium = (premiumPerDay * duration * fillAmount) / collateralAmount;
```

### Checking Remaining Amount
```typescript
const remaining = collateralAmount - filledAmount;
const canFill = remaining >= minFillAmount;
```

## Glossary

- **Offer**: Signed commitment by writer to provide option
- **Active Option**: Taken option represented as NFT
- **Writer**: Provider of collateral/liquidity
- **Taker**: Buyer of option (pays premium)
- **Strike Price**: Execution price set at option creation
- **Premium**: Payment from taker to writer (per day × duration)
- **Collateral**: Asset locked by writer
- **Settlement**: Final execution/expiry of option
- **Broadcaster**: Authorized address that can emit order events
- **Config Hash**: Identifier for token-specific configuration
- **Offer Hash**: Unique identifier for an offer

## Contact & Resources

- **Chain**: Base (Chain ID: 8453)
- **Testnet**: Base Sepolia
- **Deployment Target**: Railway
- **License**: MIT

---

*This document captures the complete context of the development conversation and should be updated as the project evolves.*
