import { OrderBookApi, OrderSigningUtils, SupportedChainId } from '@cowprotocol/cow-sdk';
import { ethers } from 'ethers';

export interface SettlementOrder {
  orderHash: string;
  order: any;
  validTo: number;
  appData: string;
}

export interface ActiveOption {
  tokenId: number;
  writer: string;
  underlying: string;
  collateralLocked: bigint;
  isCall: boolean;
  strikePrice: bigint;
  startTime: bigint;
  expiryTime: bigint;
  settled: boolean;
  configHash: string;
  offerHash: string;
}

/**
 * CowSwap Service
 * Handles settlement order creation and submission to CowSwap
 */
export class CowSwapService {
  private orderBookApi: OrderBookApi;
  private chainId: SupportedChainId;
  private protocolAddress: string;

  constructor(protocolAddress: string) {
    this.chainId = SupportedChainId.BASE; // Base mainnet
    this.protocolAddress = protocolAddress;
    this.orderBookApi = new OrderBookApi({ chainId: this.chainId });
  }

  /**
   * Create a CowSwap settlement order for an option
   */
  async createSettlementOrder(
    tokenId: number,
    option: ActiveOption,
    minBuyAmount: bigint,
    stablecoin: string
  ): Promise<SettlementOrder> {
    const validTo = Math.floor(Date.now() / 1000) + 3600; // 1 hour validity

    // Build appData with hooks
    const appData = await this.buildAppData(tokenId);

    // Build CowSwap order
    const order = {
      sellToken: option.underlying,           // Sell the collateral
      buyToken: stablecoin,                   // Buy stablecoin
      sellAmount: option.collateralLocked.toString(),
      buyAmount: minBuyAmount.toString(),
      validTo,
      appData,
      feeAmount: '0',                         // No explicit fee (included in buyAmount)
      kind: 'sell' as const,
      partiallyFillable: false,
      sellTokenBalance: 'erc20' as const,     // From contract balance
      buyTokenBalance: 'erc20' as const,      // To contract
      from: this.protocolAddress,             // Contract is the seller
      receiver: this.protocolAddress,         // Contract receives proceeds
    };

    // Create order hash
    const orderHash = OrderSigningUtils.hashOrder(
      this.chainId,
      order
    );

    return {
      orderHash,
      order,
      validTo,
      appData
    };
  }

  /**
   * Build CowSwap appData with pre/post hooks
   */
  async buildAppData(tokenId: number): Promise<string> {
    const appDataContent = {
      version: '1.1.0',
      appCode: 'OptionsProtocol',
      metadata: {
        hooks: {
          pre: [{
            target: this.protocolAddress,
            callData: this.encodePreHook(tokenId),
            gasLimit: '100000'
          }],
          post: [{
            target: this.protocolAddress,
            callData: this.encodePostHook(tokenId),
            gasLimit: '200000'
          }]
        },
        orderClass: {
          orderClass: 'market' as const
        }
      }
    };

    // Hash appData (in production, would upload to IPFS)
    const appDataString = JSON.stringify(appDataContent);
    const appDataHash = ethers.keccak256(ethers.toUtf8Bytes(appDataString));

    return appDataHash;
  }

  /**
   * Encode pre-settlement hook call data
   */
  private encodePreHook(tokenId: number): string {
    const iface = new ethers.Interface([
      'function preSettlementHook(uint256 tokenId)'
    ]);
    return iface.encodeFunctionData('preSettlementHook', [tokenId]);
  }

  /**
   * Encode post-settlement hook call data
   * Note: proceedsReceived will be filled by CowSwap at execution time
   */
  private encodePostHook(tokenId: number): string {
    const iface = new ethers.Interface([
      'function postSettlementHook(uint256 tokenId, uint256 proceedsReceived)'
    ]);
    // Use 0 as placeholder - CowSwap will replace with actual proceeds
    return iface.encodeFunctionData('postSettlementHook', [tokenId, 0]);
  }

  /**
   * Submit order to CowSwap with EIP-1271 signature
   */
  async submitOrder(
    order: any,
    eip1271Signature: string
  ): Promise<string> {
    try {
      const result = await this.orderBookApi.sendOrder({
        ...order,
        signature: eip1271Signature,
        signingScheme: 'eip1271' as const,
        from: this.protocolAddress  // Contract address
      });

      return result; // Returns order UID
    } catch (error) {
      console.error('Failed to submit order to CowSwap:', error);
      throw new Error(`CowSwap submission failed: ${error.message}`);
    }
  }

  /**
   * Monitor order status
   */
  async getOrderStatus(orderUid: string): Promise<any> {
    try {
      return await this.orderBookApi.getOrder(orderUid);
    } catch (error) {
      console.error('Failed to get order status:', error);
      throw new Error(`Failed to get order status: ${error.message}`);
    }
  }

  /**
   * Build EIP-1271 signature for CowSwap
   * Signature format: tokenId (32 bytes) + taker signature (65 bytes)
   */
  buildEIP1271Signature(tokenId: number, takerSignature: string): string {
    // Encode tokenId as 32 bytes
    const tokenIdBytes = ethers.zeroPadValue(
      ethers.toBeHex(tokenId),
      32
    );

    // Concatenate: tokenId + taker signature
    return ethers.concat([tokenIdBytes, takerSignature]);
  }
}
