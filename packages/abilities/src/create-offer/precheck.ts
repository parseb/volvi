import { ethers } from 'ethers';
import type { CreateOfferParams } from './schema';

interface PrecheckContext {
  delegatorPkpEthAddress: string;
}

interface PrecheckResult {
  success: boolean;
  error?: string;
}

/**
 * Precheck function - validates user can create offer
 *
 * For creating offers, we mainly validate:
 * 1. The profile exists and user owns it
 * 2. Deadline is in the future
 * 3. Parameters are reasonable
 *
 * Note: We don't need to check collateral here because offers are off-chain
 * The collateral will be locked when someone takes the option
 */
export async function precheckCreateOffer(
  params: CreateOfferParams,
  context: PrecheckContext
): Promise<PrecheckResult> {
  try {
    const { deadline, minDuration, maxDuration, minFillAmount, collateralAmount } = params;

    // Check deadline is in the future
    const now = Math.floor(Date.now() / 1000);
    if (deadline <= now) {
      return {
        success: false,
        error: `Deadline must be in the future. Current time: ${now}, Deadline: ${deadline}`,
      };
    }

    // Validate durations
    if (maxDuration < minDuration) {
      return {
        success: false,
        error: `maxDuration (${maxDuration}) must be >= minDuration (${minDuration})`,
      };
    }

    // Validate min fill amount
    const minFill = BigInt(minFillAmount);
    const collateral = BigInt(collateralAmount);

    if (minFill > collateral) {
      return {
        success: false,
        error: `minFillAmount (${minFillAmount}) cannot exceed collateralAmount (${collateralAmount})`,
      };
    }

    if (minFill === BigInt(0)) {
      return {
        success: false,
        error: 'minFillAmount must be greater than 0',
      };
    }

    // All checks passed
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Precheck failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
