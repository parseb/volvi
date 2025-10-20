import { createVincentAbility } from '@lit-protocol/vincent-sdk';
import { createProfileParamsSchema } from './schema';
import { precheckCreateProfile } from './precheck';
import createProfileLitAction from './litAction';

/**
 * Create Liquidity Profile Vincent Ability
 *
 * This ability allows users to create a USDC liquidity profile
 * for writing options through their Vincent Agent Wallet.
 *
 * Flow:
 * 1. User approves USDC spending (using ERC20 Approval ability)
 * 2. User calls this ability to create profile
 * 3. Profile is created on-chain with USDC deposited
 */
export const bundledVincentAbility = createVincentAbility({
  name: 'Create Liquidity Profile',
  description: 'Create a USDC liquidity profile for writing options',
  version: '1.0.0',

  // Parameter validation schema
  paramsSchema: createProfileParamsSchema,

  // Precheck function - validates before execution
  precheck: precheckCreateProfile,

  // Lit Action code (will be published to IPFS)
  litActionCode: createProfileLitAction,

  // Supported policies
  policies: [
    {
      name: 'Spending Limit',
      policyId: 'spending-limit-v1',
      description: 'Limit total USDC deposited in profiles',
    },
    {
      name: 'Time Lock',
      policyId: 'time-lock-v1',
      description: 'Prevent creating profiles more than X times per day',
    },
  ],
});

// Export types and schema
export * from './schema';
export { precheckCreateProfile } from './precheck';
