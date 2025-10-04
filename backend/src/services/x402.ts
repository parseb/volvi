import { ethers } from 'ethers';
import type { EIP3009Authorization } from './relayer.js';

export interface GasCost {
  estimatedGas: number;
  gasPriceWei: bigint;
  gasCostETH: string;
  gasCostUSD: string;
  gasCostUSDC: bigint;
  ethPriceUSD: number;
}

/**
 * x402 Service
 * Handles gas payment calculations and verification
 */
export class x402Service {
  private provider: ethers.Provider;
  private ethPriceUSD: number; // Simplified - would use oracle in production

  constructor(rpcUrl: string, ethPriceUSD: number = 2500) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.ethPriceUSD = ethPriceUSD;
  }

  /**
   * Calculate gas cost with current prices
   */
  async calculateGasCost(estimatedGas: number = 500000): Promise<GasCost> {
    try {
      // Get current gas price from network
      const feeData = await this.provider.getFeeData();
      const gasPriceWei = feeData.gasPrice || ethers.parseUnits('1', 'gwei');

      // Calculate gas cost in ETH
      const gasCostWei = gasPriceWei * BigInt(estimatedGas);
      const gasCostETH = ethers.formatEther(gasCostWei);

      // Convert to USD
      const gasCostUSDFloat = parseFloat(gasCostETH) * this.ethPriceUSD;

      // Add 20% buffer for volatility and safety
      const gasCostWithBuffer = gasCostUSDFloat * 1.2;

      // Convert to USDC (6 decimals)
      const gasCostUSDC = ethers.parseUnits(
        gasCostWithBuffer.toFixed(6),
        6
      );

      return {
        estimatedGas,
        gasPriceWei,
        gasCostETH,
        gasCostUSD: gasCostWithBuffer.toFixed(6),
        gasCostUSDC,
        ethPriceUSD: this.ethPriceUSD
      };
    } catch (error) {
      console.error('Gas calculation failed:', error);

      // Return safe fallback
      return {
        estimatedGas,
        gasPriceWei: ethers.parseUnits('1', 'gwei'),
        gasCostETH: '0.0',
        gasCostUSD: '0.05',
        gasCostUSDC: ethers.parseUnits('0.05', 6),
        ethPriceUSD: this.ethPriceUSD
      };
    }
  }

  /**
   * Verify gas authorization is sufficient
   */
  async verifyGasAuth(
    auth: EIP3009Authorization,
    expectedCost: bigint
  ): Promise<boolean> {
    try {
      const providedAmount = BigInt(auth.value);

      // Check if provided amount covers expected cost
      if (providedAmount < expectedCost) {
        console.warn(
          `Gas auth insufficient: provided ${providedAmount}, expected ${expectedCost}`
        );
        return false;
      }

      // Verify time bounds
      const now = Math.floor(Date.now() / 1000);
      if (now < auth.validAfter) {
        console.warn('Gas auth not yet valid');
        return false;
      }
      if (now > auth.validBefore) {
        console.warn('Gas auth expired');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Gas auth verification failed:', error);
      return false;
    }
  }

  /**
   * Calculate actual gas cost from transaction receipt
   */
  async processReimbursement(
    txHash: string
  ): Promise<{
    gasUsed: bigint;
    actualCostETH: string;
    actualCostUSD: string;
    actualCostUSDC: bigint;
  }> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }

      const gasUsed = receipt.gasUsed;
      const gasPrice = receipt.gasPrice || 0n;

      // Calculate actual cost
      const actualCostWei = gasUsed * gasPrice;
      const actualCostETH = ethers.formatEther(actualCostWei);
      const actualCostUSDFloat = parseFloat(actualCostETH) * this.ethPriceUSD;

      // Convert to USDC
      const actualCostUSDC = ethers.parseUnits(
        actualCostUSDFloat.toFixed(6),
        6
      );

      console.log(`Actual gas cost: ${actualCostETH} ETH ($${actualCostUSDFloat.toFixed(2)})`);

      return {
        gasUsed,
        actualCostETH,
        actualCostUSD: actualCostUSDFloat.toFixed(6),
        actualCostUSDC
      };
    } catch (error) {
      console.error('Reimbursement processing failed:', error);
      throw error;
    }
  }

  /**
   * Update ETH price (would fetch from oracle in production)
   */
  updateEthPrice(newPrice: number): void {
    this.ethPriceUSD = newPrice;
    console.log(`ETH price updated to $${newPrice}`);
  }

  /**
   * Get current ETH price
   */
  getEthPrice(): number {
    return this.ethPriceUSD;
  }
}
