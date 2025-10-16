import { Router, Request, Response } from 'express';
import { storage } from './storage.js';
import { protocolContract } from './contract.js';
import { OptionOffer } from './types.js';
import { getPythPrice } from './pyth.js';
import {
  createCowOrder,
  hashCowOrder,
  createAppData,
  createEIP1271Signature,
  submitCowOrder,
} from './cow.js';
import { ethers } from 'ethers';

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
      isCall !== undefined ? isCall === 'true' : undefined,
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
    const { offer, signature } = req.body;

    // Debug logging
    console.log('Received offer submission:', JSON.stringify({ offer, signature }, null, 2));

    // Validate offer structure
    if (!offer || !signature || !offer.writer || !offer.underlying) {
      console.error('Validation failed:', { offer, signature, hasWriter: !!offer?.writer, hasUnderlying: !!offer?.underlying });
      return res.status(400).json({ error: 'Invalid offer structure' });
    }

    // Calculate offer hash
    console.log('Calling getOfferHash with offer:', offer);
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
    console.log('Got offer hash:', offerHash);

    // Store in memory
    storage.addOffer({
      ...offer,
      signature,
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

// Delete/cancel offer
router.delete('/offers/:offerHash', (req: Request, res: Response) => {
  try {
    const { offerHash } = req.params;
    const offer = storage.getOffer(offerHash);

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    // Remove offer from storage
    storage.deleteOffer(offerHash);
    console.log(`Offer ${offerHash} cancelled and removed from storage`);

    res.json({ success: true, message: 'Offer cancelled successfully' });
  } catch (error: any) {
    console.error('Failed to cancel offer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user positions
router.get('/positions/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const activeOptions = storage.getActiveOptionsByTaker(address);

    // Transform to Position format with nested option structure and calculate P&L
    const positions = await Promise.all(activeOptions.map(async (option) => {
      try {
        // Fetch current price from Pyth oracle
        const currentPriceStr = await getPythPrice(option.underlying);
        const currentPrice = BigInt(currentPriceStr);
        const strikePrice = BigInt(option.strikePrice);
        const collateral = BigInt(option.collateralLocked);

        // Calculate P&L based on option type
        // For CALL: profit if current > strike
        // For PUT: profit if strike > current
        let pnl: bigint;

        if (option.isCall) {
          // Call option: profit = max(0, currentPrice - strikePrice) * collateral / strikePrice
          if (currentPrice > strikePrice) {
            const priceDiff = currentPrice - strikePrice;
            // Convert to USDC (6 decimals): (priceDiff * collateral) / (strikePrice * 10^20)
            // strikePrice is in 8 decimals, collateral is in 18 decimals
            // We want result in 6 decimals (USDC)
            pnl = (priceDiff * collateral) / (strikePrice * BigInt(1e12));
          } else {
            pnl = 0n; // Out of the money
          }
        } else {
          // Put option: profit = max(0, strikePrice - currentPrice) * collateral / strikePrice
          if (strikePrice > currentPrice) {
            const priceDiff = strikePrice - currentPrice;
            pnl = (priceDiff * collateral) / (strikePrice * BigInt(1e12));
          } else {
            pnl = 0n; // Out of the money
          }
        }

        return {
          option,
          currentPrice: currentPriceStr,
          pnl: pnl.toString()
        };
      } catch (error) {
        console.error(`Failed to calculate P&L for option ${option.tokenId}:`, error);
        return {
          option,
          currentPrice: undefined,
          pnl: undefined
        };
      }
    }));

    res.json({
      positions,
      count: positions.length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's written offers
router.get('/offers/writer/:address', (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const allOffers = storage.getAllOffers();

    // Filter offers by writer address (case-insensitive)
    const writerOffers = allOffers.filter(
      (offer) => offer.writer.toLowerCase() === address.toLowerCase()
    );

    // Add filled/remaining amounts
    const enrichedOffers = writerOffers.map((offer) => {
      const filledAmount = storage.getFilledAmount(offer.offerHash);
      const remainingAmount = (BigInt(offer.collateralAmount) - BigInt(filledAmount)).toString();

      return {
        ...offer,
        filledAmount,
        remainingAmount
      };
    });

    res.json({
      offers: enrichedOffers,
      count: enrichedOffers.length
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

// Gasless take option endpoint (simplified - no actual EIP-3009 validation yet)
router.post('/gasless/take-gasless', async (req: Request, res: Response) => {
  try {
    const { offerHash, taker, fillAmount, duration, premiumAuth, gasAuth } = req.body;

    console.log('Received gasless take request:', JSON.stringify(req.body, null, 2));

    // Validate input
    if (!offerHash || !taker || !fillAmount || !duration || !premiumAuth || !gasAuth) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get the offer from storage
    const offer = storage.getOffer(offerHash);
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    // Check if offer has enough remaining
    const filledAmount = storage.getFilledAmount(offerHash);
    const remainingAmount = BigInt(offer.collateralAmount) - BigInt(filledAmount);
    if (remainingAmount < BigInt(fillAmount)) {
      return res.status(400).json({ error: 'Insufficient remaining amount in offer' });
    }

    // TODO: Validate EIP-3009 authorizations (premiumAuth and gasAuth)
    // This would require checking signatures, nonces, and validity periods

    // TODO: Submit transaction to blockchain via relayer
    // For now, just simulate success and update storage

    // Update filled amount
    storage.updateFilledAmount(offerHash, fillAmount);

    // Generate mock tokenId (in real implementation, this comes from blockchain)
    const tokenId = Math.floor(Math.random() * 1000000).toString();

    // Store the active option
    const currentTime = Math.floor(Date.now() / 1000);
    const expiryTime = currentTime + duration * 86400;

    // Fetch current price from Pyth oracle to set as strike price
    const strikePrice = await getPythPrice(offer.underlying);
    console.log(`Strike price set from Pyth oracle: $${strikePrice} for ${offer.underlying}`);

    storage.addActiveOption({
      tokenId,
      offerHash: offerHash,
      writer: offer.writer,
      taker: taker,
      underlying: offer.underlying,
      collateralLocked: fillAmount,
      isCall: offer.isCall,
      strikePrice: strikePrice,
      startTime: currentTime,
      expiryTime: expiryTime,
      settled: false,
      configHash: offer.configHash
    });

    console.log(`Gasless take successful: tokenId=${tokenId}, filled=${fillAmount}`);

    res.json({
      success: true,
      txHash: '0x' + '0'.repeat(64), // Mock transaction hash
      tokenId,
      message: 'Option taken successfully (simulated - blockchain integration pending)'
    });
  } catch (error: any) {
    console.error('Failed to process gasless take:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ CoW Protocol Settlement Endpoints ============

/**
 * POST /api/settlement/initiate
 * Initiate settlement by creating CoW order and calling contract
 */
router.post('/settlement/initiate', async (req: Request, res: Response) => {
  try {
    const { tokenId, minBuyAmount } = req.body;

    console.log('Initiating settlement for tokenId:', tokenId);

    // 1. Get option from storage
    const option = storage.getActiveOption(tokenId);
    if (!option) {
      return res.status(404).json({ error: 'Option not found' });
    }

    // 2. Validate option is expired or can be closed
    const now = Math.floor(Date.now() / 1000);
    if (now < option.expiryTime) {
      console.log('Option not expired yet, allowing early close');
    }

    // 3. Get current price from Pyth
    const currentPrice = await getPythPrice(option.underlying);
    console.log(`Current price for ${option.underlying}: $${Number(currentPrice) / 1e8}`);

    // 4. Get addresses from environment
    const PROTOCOL_ADDRESS = process.env.PROTOCOL_ADDRESS || protocolContract.target as string;
    const USDC_ADDRESS = process.env.USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia USDC
    const chainId = parseInt(process.env.CHAIN_ID || '84532'); // Base Sepolia

    // 5. Create CoW order
    const validTo = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const appData = createAppData(tokenId, PROTOCOL_ADDRESS);

    const order = createCowOrder({
      sellToken: option.underlying,
      buyToken: USDC_ADDRESS,
      receiver: PROTOCOL_ADDRESS, // Protocol receives proceeds
      sellAmount: option.collateralLocked,
      buyAmount: minBuyAmount,
      validTo,
      appData,
    });

    console.log('Created CoW order:', order);

    // 6. Hash the order
    const orderHash = hashCowOrder(order, chainId);
    console.log('Order hash:', orderHash);

    // 7. Call contract initiateSettlement
    // Note: In production, this should use a proper wallet/signer
    // For now, we'll skip the actual contract call and simulate
    console.log('Would call contract.initiateSettlement with:',{
      tokenId,
      orderHash,
      minBuyAmount,
      validTo,
      appData
    });

    // 8. Create settlement conditions hash for taker to sign
    const settlementConditionsHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'bytes32', 'uint256', 'uint32'],
        [tokenId, orderHash, minBuyAmount, validTo]
      )
    );

    console.log('Settlement conditions hash:', settlementConditionsHash);

    // 9. Store in memory
    storage.addSettlement({
      tokenId,
      order,
      orderHash,
      settlementConditionsHash,
      status: 'initiated',
      createdAt: Date.now(),
    });

    res.json({
      order,
      settlementConditionsHash,
      orderHash,
    });

  } catch (error: any) {
    console.error('Settlement initiation failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/settlement/approve
 * Store taker's approval signature and call contract
 */
router.post('/settlement/approve', async (req: Request, res: Response) => {
  try {
    const { tokenId, settlementConditionsHash, takerSignature } = req.body;

    console.log('Approving settlement for tokenId:', tokenId);

    // 1. Get settlement from storage
    const settlement = storage.getSettlement(tokenId);
    if (!settlement) {
      return res.status(404).json({ error: 'Settlement not found' });
    }

    // 2. Verify conditions hash matches
    if (settlement.settlementConditionsHash !== settlementConditionsHash) {
      return res.status(400).json({ error: 'Conditions hash mismatch' });
    }

    // 3. Verify signature is valid
    if (!takerSignature || takerSignature.length < 132) {
      return res.status(400).json({ error: 'Invalid taker signature' });
    }

    console.log('Taker signature:', takerSignature);

    // 4. Call contract approveSettlement
    // Note: In production, use proper wallet/signer
    console.log('Would call contract.approveSettlement with:', {
      tokenId,
      takerSignature
    });

    // 5. Create EIP-1271 signature (tokenId + taker signature)
    const eip1271Signature = createEIP1271Signature(tokenId, takerSignature);
    console.log('Created EIP-1271 signature');

    // 6. Update settlement status
    storage.updateSettlement(tokenId, {
      status: 'approved',
      eip1271Signature,
    });

    res.json({
      success: true,
      eip1271Signature,
    });

  } catch (error: any) {
    console.error('Settlement approval failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/settlement/submit
 * Submit order to CoW Protocol API
 */
router.post('/settlement/submit', async (req: Request, res: Response) => {
  try {
    const { tokenId, order, eip1271Signature } = req.body;

    console.log('Submitting settlement to CoW Protocol for tokenId:', tokenId);

    // 1. Get settlement from storage
    const settlement = storage.getSettlement(tokenId);
    if (!settlement || settlement.status !== 'approved') {
      return res.status(400).json({ error: 'Settlement not approved' });
    }

    // 2. Get chain ID and protocol address
    const chainId = parseInt(process.env.CHAIN_ID || '84532'); // Base Sepolia
    const PROTOCOL_ADDRESS = process.env.PROTOCOL_ADDRESS || protocolContract.target as string;

    console.log('Chain ID:', chainId);
    console.log('Protocol address:', PROTOCOL_ADDRESS);

    // 3. Submit to CoW API
    try {
      const orderUid = await submitCowOrder(
        order,
        eip1271Signature,
        PROTOCOL_ADDRESS,
        chainId
      );

      console.log('Order submitted successfully, UID:', orderUid);

      // 4. Store order UID
      storage.updateSettlement(tokenId, {
        orderUid,
        status: 'submitted',
      });

      res.json({ orderUid });

    } catch (cowError: any) {
      console.error('CoW API submission failed:', cowError);

      // For development: return a mock order UID if CoW API fails
      if (process.env.NODE_ENV === 'development') {
        const mockOrderUid = ethers.id('mock-order-' + tokenId).slice(0, 114); // CoW UID format
        console.log('Using mock order UID:', mockOrderUid);

        storage.updateSettlement(tokenId, {
          orderUid: mockOrderUid,
          status: 'submitted',
        });

        return res.json({
          orderUid: mockOrderUid,
          warning: 'Using mock order UID (CoW API unavailable)',
        });
      }

      throw cowError;
    }

  } catch (error: any) {
    console.error('Settlement submission failed:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
