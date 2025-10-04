import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import { z } from 'zod';
import { RelayerService, type OptionOffer, type EIP3009Authorization } from '../services/relayer.js';
import { x402Service } from '../services/x402.js';

const router = Router();

// Validation schemas
const EIP3009AuthSchema = z.object({
  from: z.string(),
  to: z.string(),
  value: z.string(),
  validAfter: z.number(),
  validBefore: z.number(),
  nonce: z.string(),
  v: z.number(),
  r: z.string(),
  s: z.string()
});

const OptionOfferSchema = z.object({
  writer: z.string(),
  underlying: z.string(),
  strike: z.string(),
  premium: z.string(),
  optionType: z.number(),
  oracle: z.string(),
  expiry: z.number(),
  nonce: z.string()
});

const TakeGaslessSchema = z.object({
  offer: OptionOfferSchema,
  offerSignature: z.string(),
  fillAmount: z.string(),
  duration: z.number(),
  premiumAuth: EIP3009AuthSchema,
  gasAuth: EIP3009AuthSchema
});

/**
 * POST /api/options/take-gasless
 * Submit a gasless option take transaction
 */
router.post('/take-gasless', async (req: Request, res: Response) => {
  try {
    // Validate request
    const validated = TakeGaslessSchema.parse(req.body);

    const relayer = new RelayerService(
      process.env.RPC_URL || 'http://localhost:8545',
      process.env.RELAYER_PRIVATE_KEY!,
      process.env.PROTOCOL_ADDRESS!,
      process.env.USDC_ADDRESS!
    );

    const x402 = new x402Service(
      process.env.RPC_URL || 'http://localhost:8545',
      parseFloat(process.env.ETH_PRICE_USD || '2500')
    );

    // Step 1: Estimate gas cost
    const gasCost = await x402.calculateGasCost(500000); // 500k gas estimate

    console.log(`Gas estimate: ${gasCost.gasCostUSDC} USDC (${gasCost.gasCostETH} ETH)`);

    // Step 2: Verify gas authorization
    const gasAuthValid = await x402.verifyGasAuth(
      validated.gasAuth,
      gasCost.gasCostUSDC
    );

    if (!gasAuthValid) {
      return res.status(400).json({
        error: 'Invalid gas authorization',
        required: gasCost.gasCostUSDC.toString(),
        provided: validated.gasAuth.value
      });
    }

    // Step 3: Verify premium authorization
    const expectedPremium = BigInt(validated.offer.premium) * BigInt(validated.fillAmount) / BigInt(1e18);
    const providedPremium = BigInt(validated.premiumAuth.value);

    if (providedPremium < expectedPremium) {
      return res.status(400).json({
        error: 'Insufficient premium authorization',
        required: expectedPremium.toString(),
        provided: providedPremium.toString()
      });
    }

    // Step 4: Check vault balance
    const vaultStatus = await relayer.checkVaultBalance();
    if (!vaultStatus.canProcessTransaction) {
      return res.status(503).json({
        error: 'Relayer vault insufficient',
        balance: vaultStatus.balance.toString(),
        required: vaultStatus.requiredReserve.toString()
      });
    }

    // Step 5: Submit transaction
    console.log('Submitting gasless take transaction...');
    const result = await relayer.submitGaslessTake(
      validated.offer,
      validated.offerSignature,
      validated.fillAmount,
      validated.duration,
      validated.premiumAuth,
      validated.gasAuth
    );

    // Step 6: Process reimbursement
    const reimbursement = await x402.processReimbursement(result.txHash);

    console.log(`Transaction successful: ${result.txHash}`);
    console.log(`Gas reimbursement: ${reimbursement.actualCostUSDC} USDC`);

    return res.json({
      success: true,
      txHash: result.txHash,
      tokenId: result.tokenId.toString(),
      gasUsed: reimbursement.gasUsed.toString(),
      gasCostUSDC: reimbursement.actualCostUSDC.toString(),
      gasCostETH: reimbursement.actualCostETH,
      gasCostUSD: reimbursement.actualCostUSD
    });
  } catch (error) {
    console.error('Gasless take failed:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Transaction failed'
    });
  }
});

/**
 * GET /api/options/gas-estimate
 * Get current gas cost estimate in USDC
 */
router.get('/gas-estimate', async (req: Request, res: Response) => {
  try {
    const gasLimit = parseInt(req.query.gasLimit as string) || 500000;

    const x402 = new x402Service(
      process.env.RPC_URL || 'http://localhost:8545',
      parseFloat(process.env.ETH_PRICE_USD || '2500')
    );

    const gasCost = await x402.calculateGasCost(gasLimit);

    return res.json({
      estimatedGas: gasCost.estimatedGas,
      gasPriceWei: gasCost.gasPriceWei.toString(),
      gasCostETH: gasCost.gasCostETH,
      gasCostUSD: gasCost.gasCostUSD,
      gasCostUSDC: gasCost.gasCostUSDC.toString(),
      ethPriceUSD: gasCost.ethPriceUSD
    });
  } catch (error) {
    console.error('Gas estimate failed:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to estimate gas'
    });
  }
});

/**
 * GET /api/options/vault-status
 * Get relayer vault status
 */
router.get('/vault-status', async (req: Request, res: Response) => {
  try {
    const relayer = new RelayerService(
      process.env.RPC_URL || 'http://localhost:8545',
      process.env.RELAYER_PRIVATE_KEY!,
      process.env.PROTOCOL_ADDRESS!,
      process.env.USDC_ADDRESS!
    );

    const vaultStatus = await relayer.checkVaultBalance();

    return res.json({
      balance: vaultStatus.balance.toString(),
      requiredReserve: vaultStatus.requiredReserve.toString(),
      canProcessTransaction: vaultStatus.canProcessTransaction,
      message: vaultStatus.message
    });
  } catch (error) {
    console.error('Vault status check failed:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to check vault status'
    });
  }
});

export default router;
