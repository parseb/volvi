/**
 * Volvi Options Protocol - Vincent Abilities
 *
 * This package contains custom Vincent abilities for the options protocol:
 * - Create Profile: Create USDC liquidity profiles
 * - Create Offer: Sign EIP-712 option offers
 * - Take Option: Gaslessly take options with EIP-3009
 * - Settle Option: Settle expired options
 */

// Export bundled abilities for backend use
export { bundledVincentAbility as createProfileAbility } from './create-profile';
export { bundledVincentAbility as createOfferAbility } from './create-offer';
export { bundledVincentAbility as takeOptionAbility } from './take-option';
export { bundledVincentAbility as settleOptionAbility } from './settle-option';

// Export types
export type { CreateProfileParams } from './create-profile/schema';
export type { CreateOfferParams } from './create-offer/schema';
export type { TakeOptionParams } from './take-option/schema';
export type { SettleOptionParams } from './settle-option/schema';
