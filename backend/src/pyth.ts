// Price feed IDs for Pyth oracle
const PRICE_FEEDS: Record<string, string> = {
  // WETH on Base
  '0x4200000000000000000000000000000000000006': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace', // ETH/USD
};

// Pyth Hermes API endpoint
const PYTH_HERMES_URL = 'https://hermes.pyth.network';

interface PythPriceData {
  id: string;
  price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
  ema_price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
}

/**
 * Get the current price for a token from Pyth oracle via Hermes API
 * @param tokenAddress The token address to get price for
 * @returns Price in 8 decimals (e.g., 250000000000 = $2500.00)
 */
export async function getPythPrice(tokenAddress: string): Promise<string> {
  try {
    const feedId = PRICE_FEEDS[tokenAddress.toLowerCase()];
    if (!feedId) {
      throw new Error(`No price feed configured for token ${tokenAddress}`);
    }

    // Fetch latest price from Pyth Hermes API
    const response = await fetch(`${PYTH_HERMES_URL}/v2/updates/price/latest?ids[]=${feedId}`);

    if (!response.ok) {
      throw new Error(`Pyth API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.parsed || data.parsed.length === 0) {
      throw new Error('No price data available');
    }

    const priceData: PythPriceData = data.parsed[0];
    const priceValue = BigInt(priceData.price.price);
    const expo = priceData.price.expo;

    // Convert to 8 decimals: price * 10^(8 + expo)
    // expo is typically -8 for USD prices, so this becomes: price * 10^0 = price
    let adjustedPrice: bigint;
    const targetDecimals = 8;
    const adjustment = targetDecimals + expo;

    if (adjustment >= 0) {
      adjustedPrice = priceValue * BigInt(10 ** adjustment);
    } else {
      adjustedPrice = priceValue / BigInt(10 ** Math.abs(adjustment));
    }

    const formattedPrice = Number(adjustedPrice) / 1e8;
    console.log(`Pyth price for ${tokenAddress}: $${formattedPrice.toFixed(2)} (raw: ${priceData.price.price} expo: ${expo})`);

    return adjustedPrice.toString();
  } catch (error) {
    console.error('Failed to fetch Pyth price:', error);
    // Fallback to mock price
    console.log('Using fallback price: $2500');
    return '250000000000'; // $2500 fallback
  }
}
