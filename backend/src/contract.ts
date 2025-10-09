import { ethers } from 'ethers';
import { config } from './config.js';

// Minimal ABI for OptionsProtocol
const PROTOCOL_ABI = [
  'event OrderBroadcast(bytes32 indexed offerHash, bool stored)',
  'event OptionTaken(uint256 indexed tokenId, bytes32 indexed offerHash, address indexed taker, uint256 fillAmount, uint256 strikePrice, uint256 duration)',
  'event OptionSettled(uint256 indexed tokenId, uint256 profit, address settler)',
  'function broadcastOrder(bytes32 offerHash, bool storeOnChain, tuple(address writer, address underlying, uint256 collateralAmount, address stablecoin, bool isCall, uint256 premiumPerDay, uint16 minDuration, uint16 maxDuration, uint256 minFillAmount, uint64 deadline, bytes32 configHash) offer)',
  'function getOfferHash(tuple(address writer, address underlying, uint256 collateralAmount, address stablecoin, bool isCall, uint256 premiumPerDay, uint16 minDuration, uint16 maxDuration, uint256 minFillAmount, uint64 deadline, bytes32 configHash) offer) view returns (bytes32)',
  'function getActiveOption(uint256 tokenId) view returns (tuple(uint256 tokenId, address writer, address underlying, uint256 collateralLocked, bool isCall, uint256 strikePrice, uint64 startTime, uint64 expiryTime, bool settled, bytes32 configHash, bytes32 offerHash))',
  'function getRemainingAmount(bytes32 offerHash, uint256 totalAmount) view returns (uint256)',
  'function getTokenConfig(address token) view returns (tuple(bool exists, address token, address stablecoin, uint256 minUnit, address swapVenue, uint24 poolFee, bytes32 pythPriceFeedId, address uniswapPriceFallback, address preHook, address postHook, address settlementHook, bool emergencyOverride) config, bytes32 configHash)'
];

export class ProtocolContract {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private signer?: ethers.Wallet;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);

    // Only initialize contract if address is configured
    if (config.protocolAddress) {
      this.contract = new ethers.Contract(
        config.protocolAddress,
        PROTOCOL_ABI,
        this.provider
      );

      // Setup signer for broadcaster
      if (config.broadcasterPrivateKey) {
        this.signer = new ethers.Wallet(config.broadcasterPrivateKey, this.provider);
        this.contract = this.contract.connect(this.signer) as ethers.Contract;
      }
    } else {
      // Create a dummy contract to prevent errors
      this.contract = new ethers.Contract(
        ethers.ZeroAddress,
        PROTOCOL_ABI,
        this.provider
      );
    }
  }

  async broadcastOrder(
    offerHash: string,
    storeOnChain: boolean,
    offer: any
  ): Promise<string> {
    if (!this.signer) {
      throw new Error('No signer configured for broadcaster');
    }

    const tx = await this.contract.broadcastOrder(offerHash, storeOnChain, offer);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async getOfferHash(offer: any): Promise<string> {
    return await this.contract.getOfferHash(offer);
  }

  async getRemainingAmount(offerHash: string, totalAmount: string): Promise<string> {
    const remaining = await this.contract.getRemainingAmount(offerHash, totalAmount);
    return remaining.toString();
  }

  async getActiveOption(tokenId: string): Promise<any> {
    return await this.contract.getActiveOption(tokenId);
  }

  async getTokenConfig(token: string): Promise<any> {
    const [config, configHash] = await this.contract.getTokenConfig(token);
    return { config, configHash };
  }

  // Event listeners
  onOrderBroadcast(callback: (offerHash: string, stored: boolean) => void): void {
    this.contract.on('OrderBroadcast', callback);
  }

  onOptionTaken(callback: (tokenId: string, offerHash: string, taker: string, fillAmount: string) => void): void {
    this.contract.on('OptionTaken', (tokenId, offerHash, taker, fillAmount) => {
      callback(tokenId.toString(), offerHash, taker, fillAmount.toString());
    });
  }

  onOptionSettled(callback: (tokenId: string, profit: string) => void): void {
    this.contract.on('OptionSettled', (tokenId, profit) => {
      callback(tokenId.toString(), profit.toString());
    });
  }
}

export const protocolContract = new ProtocolContract();
