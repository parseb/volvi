import { Router, Request, Response } from 'express';
import { storage } from './storage.js';
import { protocolContract } from './contract.js';
import { OptionOffer } from './types.js';

const router = Router();

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Get orderbook for a token
router.get('/orderbook/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { isCall, minDuration, maxDuration, minSize } = req.query;

    const orderbook = storage.getOrderbook(
      token,
      isCall === 'true',
      {
        minDuration: minDuration ? parseInt(minDuration as string) : undefined,
        maxDuration: maxDuration ? parseInt(maxDuration as string) : undefined,
        minSize: minSize as string | undefined
      }
    );

    res.json({ orderbook, count: orderbook.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Submit new offer (broadcaster only)
router.post('/offers', async (req: Request, res: Response) => {
  try {
    const offer: OptionOffer = req.body;

    // Validate offer structure
    if (!offer.writer || !offer.signature || !offer.underlying) {
      return res.status(400).json({ error: 'Invalid offer structure' });
    }

    // Calculate offer hash
    const offerHash = await protocolContract.getOfferHash({
      writer: offer.writer,
      underlying: offer.underlying,
      collateralAmount: offer.collateralAmount,
      stablecoin: offer.stablecoin,
      isCall: offer.isCall,
      premiumPerDay: offer.premiumPerDay,
      minDuration: offer.minDuration,
      maxDuration: offer.maxDuration,
      minFillAmount: offer.minFillAmount,
      deadline: offer.deadline,
      configHash: offer.configHash
    });

    // Store in memory
    storage.addOffer({
      ...offer,
      offerHash
    });

    // Optionally broadcast to chain (set to false for MVP to save gas)
    const storeOnChain = false;
    if (storeOnChain) {
      await protocolContract.broadcastOrder(offerHash, true, offer);
    }

    res.json({
      success: true,
      offerHash,
      broadcastedOnChain: storeOnChain
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get offer by hash
router.get('/offers/:offerHash', (req: Request, res: Response) => {
  try {
    const { offerHash } = req.params;
    const offer = storage.getOffer(offerHash);

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    const filledAmount = storage.getFilledAmount(offerHash);
    const remainingAmount = (BigInt(offer.collateralAmount) - BigInt(filledAmount)).toString();

    res.json({
      ...offer,
      filledAmount,
      remainingAmount
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user positions
router.get('/positions/:address', (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const positions = storage.getActiveOptionsByTaker(address);

    res.json({
      positions,
      count: positions.length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get token configuration
router.get('/config/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { config, configHash } = await protocolContract.getTokenConfig(token);

    res.json({
      token,
      configHash,
      config: {
        stablecoin: config.stablecoin,
        minUnit: config.minUnit.toString(),
        swapVenue: config.swapVenue,
        poolFee: config.poolFee,
        pythPriceFeedId: config.pythPriceFeedId,
        uniswapFallback: config.uniswapPriceFallback
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get active option by token ID
router.get('/options/:tokenId', async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;

    // Try in-memory first
    let option = storage.getActiveOption(tokenId);

    // Fallback to contract
    if (!option) {
      const contractOption = await protocolContract.getActiveOption(tokenId);
      option = {
        tokenId: contractOption.tokenId.toString(),
        offerHash: contractOption.offerHash,
        writer: contractOption.writer,
        taker: '', // Need to get from events
        underlying: contractOption.underlying,
        collateralLocked: contractOption.collateralLocked.toString(),
        isCall: contractOption.isCall,
        strikePrice: contractOption.strikePrice.toString(),
        startTime: contractOption.startTime,
        expiryTime: contractOption.expiryTime,
        settled: contractOption.settled,
        configHash: contractOption.configHash
      };
    }

    res.json(option);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all offers (for debugging)
router.get('/offers', (req: Request, res: Response) => {
  try {
    const offers = storage.getAllOffers();
    res.json({ offers, count: offers.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
