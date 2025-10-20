import { z } from 'zod';

/**
 * Parameters for creating a liquidity profile
 */
export const createProfileParamsSchema = z.object({
  // Contract address
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address'),

  // USDC address for approval check
  usdcAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid USDC address'),

  // Total USDC to deposit (in wei, e.g., "1000000" for 1 USDC with 6 decimals)
  totalUSDC: z.string().regex(/^\d+$/, 'Invalid amount'),

  // Maximum duration in days
  maxLockDays: z.number().int().min(1).max(365),

  // Minimum fill unit (scaled by token decimals)
  minUnit: z.string().regex(/^\d+$/, 'Invalid min unit'),

  // Minimum premium in USDC units
  minPremium: z.string().regex(/^\d+$/, 'Invalid min premium'),

  // Chain ID
  chainId: z.number().int(),

  // RPC URL for on-chain queries
  rpcUrl: z.string().url(),
});

export type CreateProfileParams = z.infer<typeof createProfileParamsSchema>;
