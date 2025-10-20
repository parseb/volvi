/**
 * Volvi Options Protocol - Vincent Abilities
 *
 * This package contains custom Vincent abilities for the options protocol:
 * - Create Profile: Create USDC liquidity profiles
 * - Create Offer: Sign EIP-712 option offers
 * - Take Option: Gaslessly take options with EIP-3009
 * - Settle Option: Settle expired options
 */

// Export all abilities
export * from './create-profile';
export * from './create-offer';
export * from './take-option';
export * from './settle-option';
