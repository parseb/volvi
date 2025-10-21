# @volvi/abilities

Vincent abilities for Volvi Options Protocol - gasless options trading powered by Lit Protocol.

## Overview

This package contains 4 custom Vincent abilities that enable gasless, user-controlled options trading on Base (and other EVM chains):

1. **Create Profile** - Create USDC liquidity profiles for writing options
2. **Create Offer** - Sign option offers with EIP-712
3. **Take Option** - Take options gaslessly with EIP-3009 USDC payments
4. **Settle Option** - Settle expired options and claim profits

Built with [Vincent](https://heyvincent.ai) and [Lit Protocol](https://litprotocol.com).

## Features

- **Gasless Transactions**: Users don't need ETH for gas fees
- **USDC Payments**: Pay premiums in USDC using EIP-3009 authorization
- **PKP Wallets**: Powered by Lit Protocol's Programmable Key Pairs
- **EIP-712 Signatures**: Secure off-chain order signing
- **Alchemy Gas Sponsorship**: Optional gas sponsorship via Alchemy

## Installation

```bash
npm install @volvi/abilities
```

## Abilities

### 1. Create Profile
**Status**: ✅ Implemented

Creates a USDC liquidity profile for writing options.

**Package:** `@volvi/abilities/create-profile`

**Parameters**:
- `contractAddress` - Options protocol contract address
- `usdcAddress` - USDC token address
- `totalUSDC` - Total USDC to deposit (in wei units)
- `maxLockDays` - Maximum lock duration (1-365 days)
- `minUnit` - Minimum fill unit
- `minPremium` - Minimum premium in USDC
- `chainId` - EVM chain ID (8453 for Base, 84532 for Base Sepolia)
- `rpcUrl` - RPC endpoint URL
- `alchemyGasSponsorApiKey` - (Optional) Alchemy API key for gas sponsorship
- `alchemyGasSponsorPolicyId` - (Optional) Alchemy policy ID

**Returns**: `userOpHash`, `profileId`

### 2. Create Offer
**Status**: ✅ Implemented

Signs an EIP-712 option offer for the orderbook.

**Package:** `@volvi/abilities/create-offer`

**Parameters**:
- `contractAddress` - Options protocol contract address
- `profileId` - Liquidity profile ID
- `asset` - Asset token address
- `quantity` - Amount of asset (in wei)
- `strike` - Strike price (scaled to 6 decimals)
- `premium` - Premium in USDC (scaled to 6 decimals)
- `deadline` - Offer expiry timestamp
- `chainId` - EVM chain ID

**Returns**: `signature`, `offerHash`

### 3. Take Option
**Status**: ✅ Implemented

Takes an option gaslessly using EIP-3009 USDC payment authorization.

**Package:** `@volvi/abilities/take-option`

**Parameters**:
- `contractAddress` - Options protocol contract address
- `offer` - Option offer object
- `offerSignature` - Writer's EIP-712 signature
- `fillAmount` - Amount to fill (in wei)
- `duration` - Option duration in days
- `paymentAuth` - EIP-3009 authorization for USDC payment
- `chainId` - EVM chain ID
- `rpcUrl` - RPC endpoint URL
- `alchemyGasSponsorApiKey` - (Optional) Alchemy API key
- `alchemyGasSponsorPolicyId` - (Optional) Alchemy policy ID

**Returns**: `userOpHash`, `tokenId`

### 4. Settle Option
**Status**: ✅ Implemented

Settles an expired option and claims profits.

**Package:** `@volvi/abilities/settle-option`

**Parameters**:
- `contractAddress` - Options protocol contract address
- `tokenId` - Option NFT token ID
- `chainId` - EVM chain ID
- `rpcUrl` - RPC endpoint URL
- `alchemyGasSponsorApiKey` - (Optional) Alchemy API key
- `alchemyGasSponsorPolicyId` - (Optional) Alchemy policy ID

**Returns**: `userOpHash`, `profit`

## Usage

### Import Abilities

```typescript
import {
  createProfileAbility,
  createOfferAbility,
  takeOptionAbility,
  settleOptionAbility
} from '@volvi/abilities';
```

### Using with Vincent SDK

```typescript
import { VincentAbilityClient } from '@lit-protocol/vincent-app-sdk';

// Initialize ability client
const client = new VincentAbilityClient({
  appId: YOUR_VINCENT_APP_ID,
  abilityIpfsCid: createProfileAbility.ipfsCid,
});

// Execute ability
const result = await client.executeAbility({
  contractAddress: '0x...',
  totalUSDC: '1000000000', // 1000 USDC (6 decimals)
  maxLockDays: 30,
  minUnit: '1000000', // 1 USDC minimum
  minPremium: '10000', // 0.01 USDC minimum
  chainId: 84532, // Base Sepolia
  rpcUrl: 'https://sepolia.base.org',
});
```

## Architecture

Each ability follows the Vincent SDK pattern:

1. **Zod Schema Validation** - Parameter validation using Zod
2. **Precheck Function** - Validates state before execution (balances, approvals, etc.)
3. **Execute Function** - Performs the blockchain interaction
4. **Gas Sponsorship** - Uses `sponsoredGasContractCall()` for gasless transactions

```
src/
├── create-profile/
│   ├── schema.ts        # Zod parameter schema
│   └── index.ts         # Vincent ability with precheck/execute
├── create-offer/
│   ├── schema.ts
│   └── index.ts
├── take-option/
│   ├── schema.ts
│   └── index.ts
├── settle-option/
│   ├── schema.ts
│   └── index.ts
└── index.ts             # Main exports
```

## Smart Contract Integration

This package interacts with the Volvi Options Protocol smart contracts:

- **Base Sepolia:** `0xD7AFfB2B3303e9Cb44C9d9aFA6bD938200b3C8F2`
- **Base Mainnet:** TBD

## Development

### Build

```bash
pnpm build
```

### Test

```bash
pnpm test
```

### Lint

```bash
pnpm lint
```

## Dependencies

- `@lit-protocol/vincent-ability-sdk` - Vincent ability framework
- `ethers` - Ethereum interactions
- `zod` - Schema validation

## Links

- **Vincent Dashboard:** https://dashboard.heyvincent.ai
- **Vincent Docs:** https://docs.heyvincent.ai
- **Lit Protocol:** https://litprotocol.com

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR on GitHub.
