import { ethers } from 'ethers';
import type { SettleOptionParams } from './schema';

interface PrecheckContext {
  delegatorPkpEthAddress: string;
}

interface PrecheckResult {
  success: boolean;
  error?: string;
}

const OPTIONS_PROTOCOL_ABI = [
  'function options(uint256 tokenId) view returns (uint256 tokenId, address writer, address underlying, uint256 collateralLocked, bool isCall, uint256 strikePrice, uint64 startTime, uint64 expiryTime, bool settled, bytes32 configHash, bytes32 offerHash)',
  'function ownerOf(uint256 tokenId) view returns (address)',
];

/**
 * Precheck function - validates user can settle option
 *
 * Checks:
 * 1. Option exists
 * 2. Option is expired
 * 3. Option not already settled
 * 4. Caller is the option holder (NFT owner) or anyone if expired
 */
export async function precheckSettleOption(
  params: SettleOptionParams,
  context: PrecheckContext
): Promise<PrecheckResult> {
  try {
    const { delegatorPkpEthAddress } = context;
    const { contractAddress, tokenId, rpcUrl } = params;

    // Connect to RPC
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const optionsContract = new ethers.Contract(
      contractAddress,
      OPTIONS_PROTOCOL_ABI,
      provider
    );

    // Get option data
    let optionData;
    try {
      optionData = await optionsContract.options(tokenId);
    } catch (error) {
      return {
        success: false,
        error: `Option ${tokenId} not found or invalid`,
      };
    }

    const [
      ,
      ,
      ,
      ,
      ,
      ,
      ,
      expiryTime,
      settled,
    ] = optionData;

    // Check if already settled
    if (settled) {
      return {
        success: false,
        error: `Option ${tokenId} is already settled`,
      };
    }

    // Check if expired
    const now = Math.floor(Date.now() / 1000);
    const isExpired = now > Number(expiryTime);

    // If not expired, only owner can settle
    if (!isExpired) {
      let owner;
      try {
        owner = await optionsContract.ownerOf(tokenId);
      } catch (error) {
        return {
          success: false,
          error: `Cannot determine owner of option ${tokenId}`,
        };
      }

      if (owner.toLowerCase() !== delegatorPkpEthAddress.toLowerCase()) {
        return {
          success: false,
          error: `Only the option holder can settle before expiry. Option expires at ${new Date(Number(expiryTime) * 1000).toISOString()}`,
        };
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Precheck failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
