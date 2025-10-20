import { createVincentAbility } from '@lit-protocol/vincent-sdk';
import { settleOptionParamsSchema } from './schema';
import { precheckSettleOption } from './precheck';
import settleOptionLitAction from './litAction';

/**
 * Settle Option Vincent Ability
 *
 * This ability allows users to settle their expired options
 * and receive profits (if ITM) or allows anyone to settle expired options.
 *
 * Flow:
 * 1. Option reaches expiry
 * 2. User (or anyone) calls this ability
 * 3. Contract gets current price from Pyth oracle
 * 4. Calculates profit based on strike vs current price
 * 5. Distributes proceeds to option holder
 * 6. Burns option NFT
 */
export const bundledVincentAbility = createVincentAbility({
  name: 'Settle Option',
  description: 'Settle an expired option and claim profits',
  version: '1.0.0',

  // Parameter validation schema
  paramsSchema: settleOptionParamsSchema,

  // Precheck function - validates before execution
  precheck: precheckSettleOption,

  // Lit Action code (will be published to IPFS)
  litActionCode: settleOptionLitAction,

  // Supported policies
  policies: [
    {
      name: 'Auto-Settle',
      policyId: 'auto-settle-v1',
      description: 'Automatically settle options at expiry',
    },
  ],
});

// Export types and schema
export * from './schema';
export { precheckSettleOption } from './precheck';
