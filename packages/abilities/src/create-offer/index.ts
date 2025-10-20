import { createVincentAbility } from '@lit-protocol/vincent-sdk';
import { createOfferParamsSchema } from './schema';
import { precheckCreateOffer } from './precheck';
import createOfferLitAction from './litAction';

/**
 * Create Offer Vincent Ability
 *
 * This ability allows users to create signed option offers (EIP-712)
 * that can be posted to the orderbook for takers to fill.
 *
 * Flow:
 * 1. User has a liquidity profile created
 * 2. User calls this ability with offer parameters
 * 3. PKP signs the offer with EIP-712
 * 4. Signature + offer posted to backend orderbook
 * 5. Takers can fill the offer gaslessly
 */
export const bundledVincentAbility = createVincentAbility({
  name: 'Create Option Offer',
  description: 'Create a signed option offer for the orderbook',
  version: '1.0.0',

  // Parameter validation schema
  paramsSchema: createOfferParamsSchema,

  // Precheck function - validates before execution
  precheck: precheckCreateOffer,

  // Lit Action code (will be published to IPFS)
  litActionCode: createOfferLitAction,

  // Supported policies
  policies: [
    {
      name: 'Token Whitelist',
      policyId: 'token-whitelist-v1',
      description: 'Only allow creating offers for whitelisted tokens',
    },
    {
      name: 'Premium Floor',
      policyId: 'premium-floor-v1',
      description: 'Enforce minimum premium per day',
    },
    {
      name: 'Duration Limits',
      policyId: 'duration-limits-v1',
      description: 'Restrict maximum option duration',
    },
  ],
});

// Export types and schema
export * from './schema';
export { precheckCreateOffer } from './precheck';
