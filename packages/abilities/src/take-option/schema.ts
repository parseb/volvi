import { z } from 'zod';

/**
 * EIP-3009 Authorization schema for gasless USDC payment
 */
export const eip3009AuthSchema = z.object({
  from: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid from address'),
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid to address'),
  value: z.string().regex(/^\d+$/, 'Invalid value'),
  validAfter: z.string().regex(/^\d+$/, 'Invalid validAfter'),
  validBefore: z.string().regex(/^\d+$/, 'Invalid validBefore'),
  nonce: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid nonce'),
  v: z.number().int(),
  r: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid r'),
  s: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid s'),
});

/**
 * Option offer schema (must match Create Offer)
 */
export const optionOfferSchema = z.object({
  writer: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  profileId: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  underlying: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  collateralAmount: z.string().regex(/^\d+$/),
  stablecoin: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  isCall: z.boolean(),
  premiumPerDay: z.string().regex(/^\d+$/),
  minDuration: z.number().int(),
  maxDuration: z.number().int(),
  minFillAmount: z.string().regex(/^\d+$/),
  deadline: z.number().int(),
  configHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

/**
 * Parameters for taking an option
 */
export const takeOptionParamsSchema = z.object({
  // Contract address
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address'),

  // The option offer (signed by writer)
  offer: optionOfferSchema,

  // Writer's signature on the offer
  offerSignature: z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid signature'),

  // Amount to fill (partial fills allowed)
  fillAmount: z.string().regex(/^\d+$/, 'Invalid fill amount'),

  // Duration in days
  duration: z.number().int().min(1).max(365),

  // EIP-3009 authorization for premium + gas payment
  // This is a combined payment (premium + gas fee in one authorization)
  paymentAuth: eip3009AuthSchema,

  // Chain ID
  chainId: z.number().int(),

  // RPC URL for on-chain queries
  rpcUrl: z.string().url(),
});

export type TakeOptionParams = z.infer<typeof takeOptionParamsSchema>;
export type OptionOffer = z.infer<typeof optionOfferSchema>;
export type EIP3009Auth = z.infer<typeof eip3009AuthSchema>;
