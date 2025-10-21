import {
  createVincentAbility,
  asBundledVincentAbility,
  supportedPoliciesForAbility,
  sponsoredGasContractCall
} from '@lit-protocol/vincent-ability-sdk';
import { z } from 'zod';
import { takeOptionParamsSchema } from './schema';

const executeSuccessSchema = z.object({
  success: z.literal(true),
  userOpHash: z.string(),
  tokenId: z.string().optional(),
});

const executeFailSchema = z.object({ error: z.string() });
const precheckSuccessSchema = z.object({ success: z.literal(true) });
const precheckFailSchema = z.object({ error: z.string() });

const takeOptionAbility = createVincentAbility({
  packageName: '@volvi/abilities/take-option@1.0.0',
  abilityDescription: 'Take an option gaslessly with USDC payment',
  abilityParamsSchema: takeOptionParamsSchema,
  supportedPolicies: supportedPoliciesForAbility([]),
  precheckSuccessSchema,
  precheckFailSchema,
  executeSuccessSchema,
  executeFailSchema,

  precheck: async ({ abilityParams }, { succeed, fail }) => {
    // Simplified precheck - full validation would check balances, etc.
    return succeed({ success: true });
  },

  execute: async ({ abilityParams }, { succeed, fail, delegation }) => {
    try {
      const {
        contractAddress,
        offer,
        offerSignature,
        fillAmount,
        duration,
        paymentAuth,
        chainId,
        alchemyGasSponsorApiKey,
        alchemyGasSponsorPolicyId,
      } = abilityParams;

      const abi = ['function takeOptionGasless((address,bytes32,address,uint256,address,bool,uint256,uint16,uint16,uint256,uint64,bytes32),bytes,uint256,uint16,(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)) external returns (uint256)'];

      const userOpHash = await sponsoredGasContractCall({
        pkpPublicKey: delegation.delegatorPkpInfo.publicKey,
        abi,
        contractAddress,
        functionName: 'takeOptionGasless',
        args: [
          [offer.writer, offer.profileId, offer.underlying, offer.collateralAmount, offer.stablecoin, offer.isCall, offer.premiumPerDay, offer.minDuration, offer.maxDuration, offer.minFillAmount, offer.deadline, offer.configHash],
          offerSignature,
          fillAmount,
          duration,
          [paymentAuth.from, paymentAuth.to, paymentAuth.value, paymentAuth.validAfter, paymentAuth.validBefore, paymentAuth.nonce, paymentAuth.v, paymentAuth.r, paymentAuth.s]
        ],
        chainId,
        eip7702AlchemyApiKey: alchemyGasSponsorApiKey,
        eip7702AlchemyPolicyId: alchemyGasSponsorPolicyId,
      });

      return succeed({ success: true, userOpHash, tokenId: undefined });
    } catch (error) {
      return fail({ error: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  },
});

export const bundledVincentAbility: any = asBundledVincentAbility(takeOptionAbility, 'IPFS_CID_PLACEHOLDER');
export * from './schema';
export type { TakeOptionParams } from './schema';
