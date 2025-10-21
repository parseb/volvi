import {
  createVincentAbility,
  asBundledVincentAbility,
  supportedPoliciesForAbility,
  sponsoredGasContractCall
} from '@lit-protocol/vincent-ability-sdk';
import { z } from 'zod';
import { settleOptionParamsSchema } from './schema';

const executeSuccessSchema = z.object({
  success: z.literal(true),
  userOpHash: z.string(),
  profit: z.string().optional(),
});

const executeFailSchema = z.object({ error: z.string() });
const precheckSuccessSchema = z.object({ success: z.literal(true) });
const precheckFailSchema = z.object({ error: z.string() });

const settleOptionAbility = createVincentAbility({
  packageName: '@volvi/abilities/settle-option@1.0.0',
  abilityDescription: 'Settle an expired option and claim profits',
  abilityParamsSchema: settleOptionParamsSchema,
  supportedPolicies: supportedPoliciesForAbility([]),
  precheckSuccessSchema,
  precheckFailSchema,
  executeSuccessSchema,
  executeFailSchema,

  precheck: async ({ abilityParams }, { succeed, fail }) => {
    return succeed({ success: true });
  },

  execute: async ({ abilityParams }, { succeed, fail, delegation }) => {
    try {
      const {
        contractAddress,
        tokenId,
        chainId,
        alchemyGasSponsorApiKey,
        alchemyGasSponsorPolicyId,
      } = abilityParams;

      const abi = ['function settleOption(uint256 tokenId) external'];

      const userOpHash = await sponsoredGasContractCall({
        pkpPublicKey: delegation.delegatorPkpInfo.publicKey,
        abi,
        contractAddress,
        functionName: 'settleOption',
        args: [tokenId],
        chainId,
        eip7702AlchemyApiKey: alchemyGasSponsorApiKey,
        eip7702AlchemyPolicyId: alchemyGasSponsorPolicyId,
      });

      return succeed({ success: true, userOpHash, profit: undefined });
    } catch (error) {
      return fail({ error: 'Execution failed: ' + (error instanceof Error ? error.message : 'Unknown error') });
    }
  },
});

export const bundledVincentAbility: any = asBundledVincentAbility(settleOptionAbility, 'IPFS_CID_PLACEHOLDER');
export * from './schema';
export type { SettleOptionParams } from './schema';
