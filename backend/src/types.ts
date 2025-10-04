export interface OptionOffer {
  writer: string;
  underlying: string;
  collateralAmount: string;
  stablecoin: string;
  isCall: boolean;
  premiumPerDay: string;
  minDuration: number;
  maxDuration: number;
  minFillAmount: string;
  deadline: number;
  configHash: string;
  signature: string;
  offerHash: string;
}

export interface ActiveOption {
  tokenId: string;
  offerHash: string;
  writer: string;
  taker: string;
  underlying: string;
  collateralLocked: string;
  isCall: boolean;
  strikePrice: string;
  startTime: number;
  expiryTime: number;
  settled: boolean;
  configHash: string;
}

export interface TokenConfig {
  token: string;
  stablecoin: string;
  minUnit: string;
  swapVenue: string;
  poolFee: number;
  pythPriceFeedId: string;
  uniswapFallback: string;
  configHash: string;
}

export interface OrderbookEntry extends OptionOffer {
  remainingAmount: string;
  filledAmount: string;
  totalPremium: string; // premiumPerDay * remainingAmount
  isValid: boolean;
}
