import { ethers } from 'ethers';
import type { CreateProfileParams } from './schema';

interface PrecheckContext {
  delegatorPkpEthAddress: string;
}

interface PrecheckResult {
  success: boolean;
  error?: string;
}

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

/**
 * Precheck function - validates user can create profile
 * Checks:
 * 1. USDC balance is sufficient
 * 2. USDC approval is sufficient
 */
export async function precheckCreateProfile(
  params: CreateProfileParams,
  context: PrecheckContext
): Promise<PrecheckResult> {
  try {
    const { delegatorPkpEthAddress } = context;
    const { usdcAddress, contractAddress, totalUSDC, rpcUrl } = params;

    // Connect to RPC
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const usdcContract = new ethers.Contract(usdcAddress, ERC20_ABI, provider);

    // Check USDC balance
    const balance = await usdcContract.balanceOf(delegatorPkpEthAddress);
    const requiredAmount = BigInt(totalUSDC);

    if (balance < requiredAmount) {
      return {
        success: false,
        error: `Insufficient USDC balance. Have: ${ethers.formatUnits(balance, 6)} USDC, Need: ${ethers.formatUnits(requiredAmount, 6)} USDC`,
      };
    }

    // Check USDC approval
    const allowance = await usdcContract.allowance(
      delegatorPkpEthAddress,
      contractAddress
    );

    if (allowance < requiredAmount) {
      return {
        success: false,
        error: `Insufficient USDC allowance. Have: ${ethers.formatUnits(allowance, 6)} USDC approved, Need: ${ethers.formatUnits(requiredAmount, 6)} USDC. Please approve USDC spending first.`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Precheck failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
