# Volvi Options Protocol - Vincent Abilities

Custom Vincent abilities for the Volvi Options Protocol.

## Overview

This package contains Lit Actions that enable users to interact with the options protocol through their Vincent Agent Wallets (PKPs). Each ability represents a specific operation users can delegate.

## Abilities

### 1. Create Profile
**Status**: ✅ Implemented

Creates a USDC liquidity profile for writing options.

**Parameters**:
- `totalUSDC`: Amount of USDC to deposit
- `maxLockDays`: Maximum option duration
- `minUnit`: Minimum fill size
- `minPremium`: Minimum premium

**Prerequisites**: USDC approval for OptionsProtocol contract

**Policies Supported**:
- Spending Limit (max USDC deposited)
- Time Lock (rate limiting)

### 2. Create Offer
**Status**: 🚧 TODO

Signs an EIP-712 offer to write options.

### 3. Take Option
**Status**: 🚧 TODO

Takes an option gaslessly using EIP-3009 USDC authorization.

### 4. Settle Option
**Status**: 🚧 TODO

Settles an expired option.

## Development

### Install Dependencies

```bash
pnpm install
```

### Build

```bash
pnpm build
```

### Test

```bash
pnpm test
```

### Publish to IPFS

After implementing an ability:

```bash
pnpm run publish:abilities
```

This will:
1. Bundle the Lit Action code
2. Publish to IPFS
3. Return the CID for registering in Vincent Dashboard

## Usage in Backend

```typescript
import { bundledVincentAbility as createProfileAbility } from '@volvi/abilities/create-profile';
import { getVincentAbilityClient } from '@lit-protocol/vincent-app-sdk/abilityClient';

const client = getVincentAbilityClient({
  bundledVincentAbility: createProfileAbility,
  ethersSigner: delegateeSigner,
});

// Precheck
const precheckResult = await client.precheck(params, {
  delegatorPkpEthAddress: userPkpAddress,
});

// Execute
if (precheckResult.success) {
  const result = await client.execute(params, {
    delegatorPkpEthAddress: userPkpAddress,
  });
}
```

## Architecture

```
src/
├── create-profile/
│   ├── schema.ts        # Zod parameter schema
│   ├── precheck.ts      # Validation before execution
│   ├── litAction.ts     # Lit Action code (runs in Lit network)
│   └── index.ts         # Bundle ability
├── create-offer/        # TODO
├── take-option/         # TODO
├── settle-option/       # TODO
└── index.ts             # Main exports
```

## License

MIT
