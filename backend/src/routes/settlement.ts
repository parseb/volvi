import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import { z } from 'zod';
import { CowSwapService } from '../services/cowswap.js';

const router = Router();

// Validation schemas
const InitiateSettlementSchema = z.object({
  tokenId: z.string(),
  minBuyAmount: z.string()
});

const ApproveSettlementSchema = z.object({
  tokenId: z.string(),
  settlementConditionsHash: z.string(),
  takerSignature: z.string()
});

const SubmitOrderSchema = z.object({
  tokenId: z.string(),
  order: z.object({
    sellToken: z.string(),
    buyToken: z.string(),
    sellAmount: z.string(),
    buyAmount: z.string(),
    validTo: z.number(),
    appData: z.string(),
    feeAmount: z.string(),
    kind: z.string(),
    partiallyFillable: z.boolean(),
    sellTokenBalance: z.string(),
    buyTokenBalance: z.string()
  }),
  eip1271Signature: z.string()
});

/**
 * POST /api/settlement/initiate
 * Initiate settlement for an expired option
 */
router.post('/initiate', async (req: Request, res: Response) => {
  try {
    const validated = InitiateSettlementSchema.parse(req.body);

    const cowswap = new CowSwapService(
      parseInt(process.env.CHAIN_ID || '8453'), // Base mainnet
      process.env.PROTOCOL_ADDRESS!,
      process.env.USDC_ADDRESS!
    );

    // Get option details from contract
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
    const protocolContract = new ethers.Contract(
      process.env.PROTOCOL_ADDRESS!,
      [
        'function options(uint256) view returns (address taker, address writer, address underlying, uint256 strikePrice, uint256 amount, uint8 optionType, uint256 expiry, uint256 exerciseTimestamp, uint8 settlementState)',
        'function getOptionValue(uint256) view returns (uint256 payout)'
      ],
      provider
    );

    const option = await protocolContract.options(validated.tokenId);
    const payout = await protocolContract.getOptionValue(validated.tokenId);

    // Verify option is expired and not already settled
    const now = Math.floor(Date.now() / 1000);
    if (now < option.expiry) {
      return res.status(400).json({
        error: 'Option not yet expired',
        expiry: option.expiry,
        currentTime: now
      });
    }

    if (option.settlementState !== 0) { // 0 = Active
      return res.status(400).json({
        error: 'Option already in settlement',
        state: option.settlementState
      });
    }

    // Create settlement order
    const settlementOrder = await cowswap.createSettlementOrder(
      validated.tokenId,
      {
        taker: option.taker,
        writer: option.writer,
        underlying: option.underlying,
        strikePrice: option.strikePrice,
        amount: option.amount,
        optionType: option.optionType,
        expiry: option.expiry,
        exerciseTimestamp: option.exerciseTimestamp,
        settlementState: option.settlementState,
        payout: payout.toString()
      },
      validated.minBuyAmount,
      process.env.USDC_ADDRESS!
    );

    console.log(`Settlement order created for tokenId ${validated.tokenId}`);

    return res.json({
      success: true,
      tokenId: validated.tokenId,
      order: {
        sellToken: settlementOrder.sellToken,
        buyToken: settlementOrder.buyToken,
        sellAmount: settlementOrder.sellAmount,
        buyAmount: settlementOrder.buyAmount,
        validTo: settlementOrder.validTo,
        appData: settlementOrder.appData,
        feeAmount: settlementOrder.feeAmount,
        kind: settlementOrder.kind,
        partiallyFillable: settlementOrder.partiallyFillable
      },
      settlementConditionsHash: settlementOrder.settlementConditionsHash,
      message: 'Taker must approve settlement conditions'
    });
  } catch (error) {
    console.error('Settlement initiation failed:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to initiate settlement'
    });
  }
});

/**
 * POST /api/settlement/approve
 * Taker approves settlement conditions (EIP-712 signature)
 */
router.post('/approve', async (req: Request, res: Response) => {
  try {
    const validated = ApproveSettlementSchema.parse(req.body);

    const cowswap = new CowSwapService(
      parseInt(process.env.CHAIN_ID || '8453'),
      process.env.PROTOCOL_ADDRESS!,
      process.env.USDC_ADDRESS!
    );

    // Build EIP-1271 signature combining tokenId + taker signature
    const eip1271Signature = cowswap.buildEIP1271Signature(
      validated.tokenId,
      validated.takerSignature
    );

    console.log(`Settlement approved for tokenId ${validated.tokenId}`);

    return res.json({
      success: true,
      tokenId: validated.tokenId,
      eip1271Signature,
      message: 'Settlement conditions approved, ready to submit order'
    });
  } catch (error) {
    console.error('Settlement approval failed:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to approve settlement'
    });
  }
});

/**
 * POST /api/settlement/submit
 * Submit approved settlement order to CowSwap
 */
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const validated = SubmitOrderSchema.parse(req.body);

    const cowswap = new CowSwapService(
      parseInt(process.env.CHAIN_ID || '8453'),
      process.env.PROTOCOL_ADDRESS!,
      process.env.USDC_ADDRESS!
    );

    // Submit order to CowSwap
    const orderUid = await cowswap.submitOrder(
      validated.order,
      validated.eip1271Signature
    );

    console.log(`Settlement order submitted: ${orderUid}`);

    return res.json({
      success: true,
      tokenId: validated.tokenId,
      orderUid,
      message: 'Settlement order submitted to CowSwap',
      explorerUrl: `https://explorer.cow.fi/orders/${orderUid}?tab=overview`
    });
  } catch (error) {
    console.error('Settlement submission failed:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to submit settlement order'
    });
  }
});

/**
 * GET /api/settlement/status/:tokenId
 * Get settlement status for an option
 */
router.get('/status/:tokenId', async (req: Request, res: Response) => {
  try {
    const tokenId = req.params.tokenId;

    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
    const protocolContract = new ethers.Contract(
      process.env.PROTOCOL_ADDRESS!,
      [
        'function options(uint256) view returns (address taker, address writer, address underlying, uint256 strikePrice, uint256 amount, uint8 optionType, uint256 expiry, uint256 exerciseTimestamp, uint8 settlementState)',
        'function getOptionValue(uint256) view returns (uint256 payout)'
      ],
      provider
    );

    const option = await protocolContract.options(tokenId);
    const payout = await protocolContract.getOptionValue(tokenId);

    // Settlement states: 0 = Active, 1 = InSettlement, 2 = Settled
    const stateNames = ['Active', 'InSettlement', 'Settled'];

    return res.json({
      tokenId,
      taker: option.taker,
      writer: option.writer,
      underlying: option.underlying,
      strikePrice: option.strikePrice.toString(),
      amount: option.amount.toString(),
      optionType: option.optionType,
      expiry: option.expiry,
      exerciseTimestamp: option.exerciseTimestamp,
      settlementState: stateNames[option.settlementState],
      payout: payout.toString(),
      isExpired: Math.floor(Date.now() / 1000) > option.expiry
    });
  } catch (error) {
    console.error('Status check failed:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get settlement status'
    });
  }
});

/**
 * GET /api/settlement/orders/:orderUid
 * Get CowSwap order status
 */
router.get('/orders/:orderUid', async (req: Request, res: Response) => {
  try {
    const orderUid = req.params.orderUid;

    // Fetch from CowSwap API
    const chainId = parseInt(process.env.CHAIN_ID || '8453');
    const apiUrl = chainId === 1
      ? 'https://api.cow.fi/mainnet/api/v1'
      : 'https://api.cow.fi/goerli/api/v1';

    const response = await fetch(`${apiUrl}/orders/${orderUid}`);

    if (!response.ok) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }

    const orderData = await response.json();

    return res.json({
      orderUid,
      status: orderData.status,
      sellToken: orderData.sellToken,
      buyToken: orderData.buyToken,
      sellAmount: orderData.sellAmount,
      buyAmount: orderData.buyAmount,
      executedSellAmount: orderData.executedSellAmount,
      executedBuyAmount: orderData.executedBuyAmount,
      validTo: orderData.validTo,
      creationDate: orderData.creationDate,
      executionDate: orderData.executionDate
    });
  } catch (error) {
    console.error('Order status check failed:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get order status'
    });
  }
});

export default router;
