import { z } from 'zod';

/**
 * Parameters for settling an option
 */
export const settleOptionParamsSchema = z.object({
  // Contract address
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address'),

  // Token ID of the option NFT
  tokenId: z.string().regex(/^\d+$/, 'Invalid token ID'),

  // Chain ID
  chainId: z.number().int(),

  // RPC URL for on-chain queries
  rpcUrl: z.string().url(),
});

export type SettleOptionParams = z.infer<typeof settleOptionParamsSchema>;
