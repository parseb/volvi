import { ethers } from 'ethers';
import type { TakeOptionParams } from './schema';

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
 * Precheck function - validates user can take option
 *
 * Checks:
 * 1. Offer not expired
 * 2. Duration within valid range
 * 3. Fill amount valid
 * 4. User has sufficient USDC balance for premium + gas
 * 5. Payment authorization is valid
 */
export async function precheckTakeOption(
  params: TakeOptionParams,
  context: PrecheckContext
): Promise<PrecheckResult> {
  try {
    const { delegatorPkpEthAddress } = context;
    const { offer, fillAmount, duration, paymentAuth, rpcUrl } = params;

    // Check offer not expired
    const now = Math.floor(Date.now() / 1000);
    if (now > offer.deadline) {
      return {
        success: false,
        error: `Offer expired. Deadline: ${offer.deadline}, Current time: ${now}`,
      };
    }

    // Check duration is within valid range
    if (duration < offer.minDuration || duration > offer.maxDuration) {
      return {
        success: false,
        error: `Duration ${duration} days is outside valid range [${offer.minDuration}, ${offer.maxDuration}]`,
      };
    }

    // Check fill amount
    const fill = BigInt(fillAmount);
    const minFill = BigInt(offer.minFillAmount);
    const collateral = BigInt(offer.collateralAmount);

    if (fill < minFill) {
      return {
        success: false,
        error: `Fill amount ${fillAmount} is below minimum ${offer.minFillAmount}`,
      };
    }

    if (fill > collateral) {
      return {
        success: false,
        error: `Fill amount ${fillAmount} exceeds collateral ${offer.collateralAmount}`,
      };
    }

    // Check payment authorization
    if (paymentAuth.from.toLowerCase() !== delegatorPkpEthAddress.toLowerCase()) {
      return {
        success: false,
        error: `Payment authorization 'from' must be user's PKP address`,
      };
    }

    // Calculate expected payment
    const premium = (BigInt(offer.premiumPerDay) * BigInt(duration) * fill) / collateral;
    const expectedPayment = BigInt(paymentAuth.value);

    if (expectedPayment < premium) {
      return {
        success: false,
        error: `Payment authorization ${paymentAuth.value} is less than required premium ${premium.toString()}`,
      };
    }

    // Connect to RPC and check USDC balance
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const usdcContract = new ethers.Contract(offer.stablecoin, ERC20_ABI, provider);

    const balance = await usdcContract.balanceOf(delegatorPkpEthAddress);

    if (balance < expectedPayment) {
      return {
        success: false,
        error: `Insufficient USDC balance. Have: ${ethers.formatUnits(balance, 6)} USDC, Need: ${ethers.formatUnits(expectedPayment, 6)} USDC`,
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
