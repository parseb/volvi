import { z } from 'zod';

/**
 * Parameters for creating an option offer
 */
export const createOfferParamsSchema = z.object({
  // Contract address
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address'),

  // Profile ID (from createLiquidityProfile)
  profileId: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid profile ID'),

  // Underlying token address
  underlying: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid underlying address'),

  // Collateral amount (in token units)
  collateralAmount: z.string().regex(/^\d+$/, 'Invalid collateral amount'),

  // Stablecoin address (typically USDC)
  stablecoin: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid stablecoin address'),

  // Is this a call option? (false = put)
  isCall: z.boolean(),

  // Premium per day (in stablecoin units)
  premiumPerDay: z.string().regex(/^\d+$/, 'Invalid premium'),

  // Minimum duration in days
  minDuration: z.number().int().min(1).max(365),

  // Maximum duration in days
  maxDuration: z.number().int().min(1).max(365),

  // Minimum fill amount (minimum partial fill size)
  minFillAmount: z.string().regex(/^\d+$/, 'Invalid min fill amount'),

  // Offer deadline (Unix timestamp)
  deadline: z.number().int(),

  // Token config hash
  configHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid config hash'),

  // Chain ID for EIP-712 domain
  chainId: z.number().int(),
}).refine(data => data.maxDuration >= data.minDuration, {
  message: 'maxDuration must be >= minDuration',
  path: ['maxDuration'],
});

export type CreateOfferParams = z.infer<typeof createOfferParamsSchema>;
