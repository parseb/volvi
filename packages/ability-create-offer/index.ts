import {
  createVincentAbility,
  asBundledVincentAbility,
  supportedPoliciesForAbility
} from '@lit-protocol/vincent-ability-sdk';
import { z } from 'zod';
import { createOfferParamsSchema } from './schema';

/**
 * Create Offer Vincent Ability
 * Creates EIP-712 signed option offers for the orderbook
 */

const executeSuccessSchema = z.object({
  success: z.literal(true),
  signature: z.string(),
  offerHash: z.string(),
});

const executeFailSchema = z.object({ error: z.string() });
const precheckSuccessSchema = z.object({ success: z.literal(true) });
const precheckFailSchema = z.object({ error: z.string() });

const createOfferAbility = createVincentAbility({
  packageName: '@volvi/abilities/create-offer@1.0.0',
  abilityDescription: 'Create a signed option offer for the orderbook',
  abilityParamsSchema: createOfferParamsSchema,
  supportedPolicies: supportedPoliciesForAbility([]),
  precheckSuccessSchema,
  precheckFailSchema,
  executeSuccessSchema,
  executeFailSchema,

  precheck: async ({ abilityParams }, { succeed, fail }) => {
    const { deadline, minDuration, maxDuration, minFillAmount, collateralAmount } = abilityParams;
    const now = Math.floor(Date.now() / 1000);

    if (deadline <= now) {
      return fail({ error: 'Deadline must be in the future' });
    }
    if (maxDuration < minDuration) {
      return fail({ error: 'maxDuration must be >= minDuration' });
    }
    if (BigInt(minFillAmount) > BigInt(collateralAmount)) {
      return fail({ error: 'minFillAmount cannot exceed collateralAmount' });
    }

    return succeed({ success: true });
  },

  execute: async ({ abilityParams }, { succeed, fail, delegation }) => {
    try {
      const { ethers } = await import('ethers');
      const { contractAddress, chainId } = abilityParams;

      // EIP-712 Domain
      const domain = {
        name: 'OptionsProtocol',
        version: '1',
        chainId,
        verifyingContract: contractAddress,
      };

      // EIP-712 Types
      const types = {
        OptionOffer: [
          { name: 'writer', type: 'address' },
          { name: 'profileId', type: 'bytes32' },
          { name: 'underlying', type: 'address' },
          { name: 'collateralAmount', type: 'uint256' },
          { name: 'stablecoin', type: 'address' },
          { name: 'isCall', type: 'bool' },
          { name: 'premiumPerDay', type: 'uint256' },
          { name: 'minDuration', type: 'uint16' },
          { name: 'maxDuration', type: 'uint16' },
          { name: 'minFillAmount', type: 'uint256' },
          { name: 'deadline', type: 'uint64' },
          { name: 'configHash', type: 'bytes32' },
        ],
      };

      // Value - offer data signed by PKP
      const value = {
        writer: delegation.delegatorPkpInfo.ethAddress,
        profileId: abilityParams.profileId,
        underlying: abilityParams.underlying,
        collateralAmount: abilityParams.collateralAmount,
        stablecoin: abilityParams.stablecoin,
        isCall: abilityParams.isCall,
        premiumPerDay: abilityParams.premiumPerDay,
        minDuration: abilityParams.minDuration,
        maxDuration: abilityParams.maxDuration,
        minFillAmount: abilityParams.minFillAmount,
        deadline: abilityParams.deadline,
        configHash: abilityParams.configHash,
      };

      // NOTE: In production, this would use PKP signing via Lit Protocol
      // For now, placeholder signature generation
      const signature = '0x' + '0'.repeat(130);

      // Calculate offer hash
      const offerHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'bytes32', 'address', 'uint256', 'address', 'bool', 'uint256', 'uint16', 'uint16', 'uint256', 'uint64', 'bytes32'],
          [value.writer, value.profileId, value.underlying, value.collateralAmount, value.stablecoin, value.isCall, value.premiumPerDay, value.minDuration, value.maxDuration, value.minFillAmount, value.deadline, value.configHash]
        )
      );

      return succeed({ success: true, signature, offerHash });
    } catch (error) {
      return fail({ error: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  },
});

export const bundledVincentAbility: any = asBundledVincentAbility(createOfferAbility, 'IPFS_CID_PLACEHOLDER');
export * from './schema';
export type { CreateOfferParams } from './schema';
