import { ethers } from 'ethers';

export interface EIP3009Authorization {
  from: string;
  to: string;
  value: string;
  validAfter: number;
  validBefore: number;
  nonce: string;
  v: number;
  r: string;
  s: string;
}

export interface VaultStatus {
  ethBalance: bigint;
  usdcBalance: bigint;
  needsRefill: boolean;
}

/**
 * Relayer Service
 * Handles transaction submission and gas management
 */
export class RelayerService {
  private provider: ethers.Provider;
  private wallet: ethers.Wallet;
  private protocolAddress: string;
  private gasVaultAddress: string;
  private protocolContract: ethers.Contract;

  constructor(
    rpcUrl: string,
    relayerPrivateKey: string,
    protocolAddress: string,
    protocolAbi: any[],
    gasVaultAddress: string
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(relayerPrivateKey, this.provider);
    this.protocolAddress = protocolAddress;
    this.gasVaultAddress = gasVaultAddress;
    this.protocolContract = new ethers.Contract(
      protocolAddress,
      protocolAbi,
      this.wallet
    );
  }

  /**
   * Submit gasless take option transaction
   */
  async submitGaslessTake(
    offer: any,
    offerSignature: string,
    fillAmount: bigint,
    duration: number,
    premiumAuth: EIP3009Authorization,
    gasAuth: EIP3009Authorization
  ): Promise<ethers.ContractTransactionReceipt> {
    try {
      console.log('Submitting gasless take transaction...');

      // Estimate gas first
      const estimatedGas = await this.protocolContract.takeOptionGasless.estimateGas(
        offer,
        offerSignature,
        fillAmount,
        duration,
        premiumAuth,
        gasAuth
      );

      console.log(`Estimated gas: ${estimatedGas.toString()}`);

      // Submit transaction
      const tx = await this.protocolContract.takeOptionGasless(
        offer,
        offerSignature,
        fillAmount,
        duration,
        premiumAuth,
        gasAuth,
        {
          gasLimit: estimatedGas * 120n / 100n  // Add 20% buffer
        }
      );

      console.log(`Transaction submitted: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();

      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

      return receipt;
    } catch (error) {
      console.error('Gasless take failed:', error);
      throw new Error(`Relayer submission failed: ${error.message}`);
    }
  }

  /**
   * Estimate gas cost in USDC
   * Converts ETH gas cost to USDC using price oracle
   */
  async estimateGasCostUSDC(gasLimit: number = 500000): Promise<bigint> {
    try {
      // Get current gas price
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;

      // Calculate gas cost in wei
      const gasCostWei = gasPrice * BigInt(gasLimit);

      // Convert ETH to USD (simplified - should use oracle in production)
      // For now, hardcode ETH price at $2500
      const ethPriceUSD = 2500;
      const gasCostETH = Number(ethers.formatEther(gasCostWei));
      const gasCostUSD = gasCostETH * ethPriceUSD;

      // Add 20% buffer for price volatility
      const gasCostWithBuffer = gasCostUSD * 1.2;

      // Convert to USDC (6 decimals)
      const gasCostUSDC = ethers.parseUnits(
        gasCostWithBuffer.toFixed(6),
        6
      );

      console.log(`Gas cost estimate: ${ethers.formatUnits(gasCostUSDC, 6)} USDC`);

      return gasCostUSDC;
    } catch (error) {
      console.error('Gas estimation failed:', error);
      // Return fallback cost of $0.05
      return ethers.parseUnits('0.05', 6);
    }
  }

  /**
   * Check vault balances and status
   */
  async checkVaultBalance(): Promise<VaultStatus> {
    try {
      // Check ETH balance of relayer wallet
      const ethBalance = await this.provider.getBalance(this.wallet.address);

      // Check USDC balance of gas vault
      // (Would need USDC contract instance for this)
      const usdcBalance = 0n; // Placeholder

      // Determine if refill needed (< 0.1 ETH)
      const needsRefill = ethBalance < ethers.parseEther('0.1');

      if (needsRefill) {
        console.warn(`⚠️  Relayer wallet low on ETH: ${ethers.formatEther(ethBalance)} ETH`);
      }

      return {
        ethBalance,
        usdcBalance,
        needsRefill
      };
    } catch (error) {
      console.error('Failed to check vault balance:', error);
      throw error;
    }
  }

  /**
   * Get actual gas used by a transaction
   */
  async getActualGasUsed(txHash: string): Promise<bigint> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt) {
        throw new Error('Transaction not found');
      }
      return receipt.gasUsed;
    } catch (error) {
      console.error('Failed to get gas used:', error);
      throw error;
    }
  }

  /**
   * Get relayer wallet address
   */
  getRelayerAddress(): string {
    return this.wallet.address;
  }

  /**
   * Get gas vault address
   */
  getGasVaultAddress(): string {
    return this.gasVaultAddress;
  }
}
