import { z } from 'zod';

/**
 * Database schemas using Zod for validation
 * These schemas define the structure of data stored in MongoDB
 */

// Profile Schema
export const profileSchema = z.object({
  profileId: z.string(), // Hash of the profile
  owner: z.string(), // PKP ETH address
  contractAddress: z.string(),
  usdcAddress: z.string(),
  totalUSDC: z.string(),
  maxLockDays: z.number(),
  minUnit: z.string(),
  minPremium: z.string(),
  chainId: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Profile = z.infer<typeof profileSchema>;

// Offer Schema
export const offerSchema = z.object({
  offerHash: z.string(), // EIP-712 hash of the offer
  profileId: z.string(),
  writer: z.string(), // PKP ETH address
  underlying: z.string(),
  collateralAmount: z.string(),
  stablecoin: z.string(),
  isCall: z.boolean(),
  premiumPerDay: z.string(),
  minDuration: z.number(),
  maxDuration: z.number(),
  minFillAmount: z.string(),
  deadline: z.number(),
  configHash: z.string(),
  signature: z.string(), // EIP-712 signature
  filledAmount: z.string().default('0'),
  cancelled: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Offer = z.infer<typeof offerSchema>;

// Position Schema
export const positionSchema = z.object({
  tokenId: z.string(), // NFT token ID
  owner: z.string(), // PKP ETH address (option taker)
  writer: z.string(), // PKP ETH address (option writer)
  underlying: z.string(),
  collateralAmount: z.string(),
  stablecoin: z.string(),
  strikePrice: z.string(),
  premium: z.string(),
  isCall: z.boolean(),
  expiry: z.number(), // Unix timestamp
  settled: z.boolean().default(false),
  settledAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Position = z.infer<typeof positionSchema>;

// Transaction Log Schema (for auditing)
export const transactionLogSchema = z.object({
  txHash: z.string(),
  type: z.enum(['create_profile', 'create_offer', 'take_option', 'settle_option']),
  user: z.string(), // PKP ETH address
  data: z.record(z.any()), // Flexible data field for transaction-specific info
  success: z.boolean(),
  error: z.string().optional(),
  createdAt: z.date(),
});

export type TransactionLog = z.infer<typeof transactionLogSchema>;

// Export all schemas
export const schemas = {
  profile: profileSchema,
  offer: offerSchema,
  position: positionSchema,
  transactionLog: transactionLogSchema,
};
