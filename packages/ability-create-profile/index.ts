import {
  createVincentAbility,
  asBundledVincentAbility,
  supportedPoliciesForAbility,
  sponsoredGasContractCall
} from '@lit-protocol/vincent-ability-sdk';
import { z } from 'zod';
import { createProfileParamsSchema } from './schema';

/**
 * Create Liquidity Profile Vincent Ability
 *
 * This ability allows users to create a USDC liquidity profile
 * for writing options through their Vincent Agent Wallet.
 *
 * Flow:
 * 1. User approves USDC spending (using ERC20 Approval ability)
 * 2. User calls this ability to create profile
 * 3. Profile is created on-chain with USDC deposited
 */

// Success schema - returned when profile is created successfully
const executeSuccessSchema = z.object({
  success: z.literal(true),
  userOpHash: z.string(),
  profileId: z.string().optional(),
});

// Fail schema - returned when execution fails
const executeFailSchema = z.object({
  error: z.string(),
});

// Precheck success schema
const precheckSuccessSchema = z.object({
  success: z.literal(true),
});

// Precheck fail schema
const precheckFailSchema = z.object({
  error: z.string(),
});

// Create the Vincent ability
const createProfileAbility = createVincentAbility({
  packageName: '@volvi/abilities/create-profile@1.0.0',
  abilityDescription: 'Create a USDC liquidity profile for writing options',
  abilityParamsSchema: createProfileParamsSchema,
  supportedPolicies: supportedPoliciesForAbility([]),

  precheckSuccessSchema,
  precheckFailSchema,
  executeSuccessSchema,
  executeFailSchema,

  // Precheck function - validates before execution
  precheck: async ({ abilityParams }, { succeed, fail, delegation }) => {
    try {
      const { ethers } = await import('ethers');
      const { usdcAddress, contractAddress, totalUSDC, rpcUrl } = abilityParams;

      const ERC20_ABI = [
        'function balanceOf(address owner) view returns (uint256)',
        'function allowance(address owner, address spender) view returns (uint256)',
      ];

      // Connect to RPC
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const usdcContract = new ethers.Contract(usdcAddress, ERC20_ABI, provider);

      // Check USDC balance
      const balance = await usdcContract.balanceOf(delegation.delegatorPkpInfo.ethAddress);
      const requiredAmount = BigInt(totalUSDC);

      if (balance < requiredAmount) {
        return fail({
          error: `Insufficient USDC balance. Have: ${ethers.formatUnits(balance, 6)} USDC, Need: ${ethers.formatUnits(requiredAmount, 6)} USDC`,
        });
      }

      // Check USDC approval
      const allowance = await usdcContract.allowance(delegation.delegatorPkpInfo.ethAddress, contractAddress);

      if (allowance < requiredAmount) {
        return fail({
          error: `Insufficient USDC allowance. Have: ${ethers.formatUnits(allowance, 6)} USDC approved, Need: ${ethers.formatUnits(requiredAmount, 6)} USDC. Please approve USDC spending first.`,
        });
      }

      return succeed({ success: true });
    } catch (error) {
      return fail({
        error: `Precheck failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  },

  // Execute function - calls the contract
  execute: async ({ abilityParams }, { succeed, fail, delegation }) => {
    try {
      const {
        contractAddress,
        totalUSDC,
        maxLockDays,
        minUnit,
        minPremium,
        chainId,
        alchemyGasSponsorApiKey,
        alchemyGasSponsorPolicyId,
      } = abilityParams;

      // ABI for createLiquidityProfile function
      const abi = [
        'function createLiquidityProfile(uint256 totalUSDC, uint16 maxLockDays, uint256 minUnit, uint256 minPremium) external returns (bytes32 profileId)'
      ];

      // Call contract with gas sponsorship
      const userOpHash = await sponsoredGasContractCall({
        pkpPublicKey: delegation.delegatorPkpInfo.publicKey,
        abi,
        contractAddress,
        functionName: 'createLiquidityProfile',
        args: [totalUSDC, maxLockDays, minUnit, minPremium],
        chainId,
        eip7702AlchemyApiKey: alchemyGasSponsorApiKey,
        eip7702AlchemyPolicyId: alchemyGasSponsorPolicyId,
      });

      return succeed({
        success: true,
        userOpHash,
        profileId: undefined, // Will be extracted from event logs
      });
    } catch (error) {
      return fail({
        error: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  },
});

// Bundle the ability - IPFS CID will be added when publishing
export const bundledVincentAbility: any = asBundledVincentAbility(
  createProfileAbility,
  'IPFS_CID_PLACEHOLDER'
);

// Export types and schema
export * from './schema';
export type { CreateProfileParams } from './schema';
