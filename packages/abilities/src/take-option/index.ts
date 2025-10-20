import { createVincentAbility } from '@lit-protocol/vincent-sdk';
import { takeOptionParamsSchema } from './schema';
import { precheckTakeOption } from './precheck';
import takeOptionLitAction from './litAction';

/**
 * Take Option Vincent Ability
 *
 * This ability allows users to take (buy) options gaslessly using USDC.
 * Payment is made via EIP-3009 authorization, so users don't need ETH for gas.
 *
 * Flow:
 * 1. User selects an offer from the orderbook
 * 2. User specifies fill amount and duration
 * 3. Frontend calculates premium + gas fee
 * 4. User signs EIP-3009 authorization for payment
 * 5. This ability calls takeOptionGasless on the contract
 * 6. Option NFT is minted to user's PKP
 */
export const bundledVincentAbility = createVincentAbility({
  name: 'Take Option',
  description: 'Take an option gaslessly with USDC payment',
  version: '1.0.0',

  // Parameter validation schema
  paramsSchema: takeOptionParamsSchema,

  // Precheck function - validates before execution
  precheck: precheckTakeOption,

  // Lit Action code (will be published to IPFS)
  litActionCode: takeOptionLitAction,

  // Supported policies
  policies: [
    {
      name: 'Spending Limit',
      policyId: 'spending-limit-v1',
      description: 'Limit total USDC spent on options per day/week/month',
    },
    {
      name: 'Exposure Limit',
      policyId: 'exposure-limit-v1',
      description: 'Limit maximum number of open option positions',
    },
    {
      name: 'Token Whitelist',
      policyId: 'token-whitelist-v1',
      description: 'Only allow taking options on whitelisted tokens',
    },
  ],
});

// Export types and schema
export * from './schema';
export { precheckTakeOption } from './precheck';
