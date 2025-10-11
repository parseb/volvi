'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { ethers, formatUnits } from 'ethers';
import {
  createGaslessAuthorizations,
  estimateGasCost,
  verifyAuthorizationValidity,
  formatAuthorization,
  type EIP3009Authorization
} from '../lib/eip3009';
import type { OrderbookOffer } from '@/lib/types';

interface GaslessTakeSidebarProps {
  offer: OrderbookOffer | null;
  onClose: () => void;
  onSuccess: (txHash: string, tokenId: string) => void;
  backendUrl: string;
  usdcAddress: string;
  vaultAddress: string;
  chainId: number;
}

export default function GaslessTakeSidebar({
  offer,
  onClose,
  onSuccess,
  backendUrl,
  usdcAddress,
  vaultAddress,
  chainId
}: GaslessTakeSidebarProps) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [fillAmount, setFillAmount] = useState('');
  const [duration, setDuration] = useState<number>(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gasCost, setGasCost] = useState<{
    estimatedGas: number;
    gasCostUSDC: bigint;
    gasCostETH: string;
    gasCostUSD: string;
  } | null>(null);
  const [premiumAuth, setPremiumAuth] = useState<EIP3009Authorization | null>(null);
  const [gasAuth, setGasAuth] = useState<EIP3009Authorization | null>(null);

  // Load gas estimate on mount
  useEffect(() => {
    loadGasEstimate();
  }, []);

  const loadGasEstimate = async () => {
    try {
      const estimate = await estimateGasCost(backendUrl);
      setGasCost(estimate);
    } catch (err) {
      console.error('Failed to load gas estimate:', err);
      setError('Failed to load gas estimate');
    }
  };

  const calculatePremium = (): bigint => {
    if (!offer || !fillAmount) return 0n;

    const fillAmountBigInt = ethers.parseUnits(fillAmount, 18);
    const premiumPerDay = offer.premiumPerDay;

    // Premium = (fillAmount * premiumPerDay * duration) / collateralAmount
    return (fillAmountBigInt * premiumPerDay * BigInt(duration)) / offer.collateralAmount;
  };

  const handleCreateAuthorizations = async () => {
    if (!address || !walletClient || !offer || !gasCost) {
      setError('Missing required data');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const premium = calculatePremium();
      const gasAmount = gasCost.gasCostUSDC;

      // Create signer from wallet client
      const provider = new ethers.BrowserProvider(walletClient as any);
      const signer = await provider.getSigner();

      // Create authorizations
      const auths = await createGaslessAuthorizations(signer, {
        taker: address,
        writer: offer.writer,
        vault: vaultAddress,
        premiumAmount: premium,
        gasAmount: gasAmount,
        usdcAddress,
        chainId
      });

      // Verify authorizations
      const premiumValid = verifyAuthorizationValidity(auths.premiumAuth);
      const gasValid = verifyAuthorizationValidity(auths.gasAuth);

      if (!premiumValid.valid || !gasValid.valid) {
        throw new Error(`Invalid authorization: ${premiumValid.reason || gasValid.reason}`);
      }

      setPremiumAuth(auths.premiumAuth);
      setGasAuth(auths.gasAuth);

      console.log('Authorizations created successfully');
    } catch (err) {
      console.error('Failed to create authorizations:', err);
      setError(err instanceof Error ? err.message : 'Failed to create authorizations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!premiumAuth || !gasAuth || !offer) {
      setError('Missing authorizations');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Submit to backend
      const response = await fetch(`${backendUrl}/api/gasless/take-gasless`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerHash: offer.offerHash,
          taker: address,
          fillAmount: ethers.parseUnits(fillAmount, 18).toString(),
          duration,
          premiumAuth,
          gasAuth
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Transaction failed');
      }

      const result = await response.json();

      console.log('Transaction successful:', result);
      onSuccess(result.txHash, result.tokenId);
    } catch (err) {
      console.error('Failed to submit transaction:', err);
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  if (!offer) return null;

  const premium = calculatePremium();
  const totalCost = gasCost ? premium + gasCost.gasCostUSDC : premium;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 p-6 overflow-y-auto shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Take Option (Gasless)</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white text-2xl leading-none">
          ✕
        </button>
      </div>

      <div className="space-y-4">
        {/* Offer Details */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Offer Details</h3>
          <div className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
            <div><span className="font-medium">Writer:</span> {offer.writer.slice(0, 6)}...{offer.writer.slice(-4)}</div>
            <div><span className="font-medium">Type:</span> {offer.isCall ? '🟢 Call' : '🔴 Put'}</div>
            <div><span className="font-medium">Collateral:</span> {formatUnits(offer.collateralAmount.toString(), 18)}</div>
            <div><span className="font-medium">Premium:</span> {formatUnits(offer.premiumPerDay.toString(), 6)} USDC/day</div>
            <div><span className="font-medium">Duration:</span> {offer.minDuration}-{offer.maxDuration} days</div>
            <div><span className="font-medium">Remaining:</span> {formatUnits(offer.remainingAmount.toString(), 18)}</div>
          </div>
        </div>

        {/* Fill Amount */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
            Fill Amount (underlying tokens)
          </label>
          <input
            type="number"
            value={fillAmount}
            onChange={(e) => setFillAmount(e.target.value)}
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-gray-900 dark:text-white"
            placeholder="0.0"
            disabled={loading}
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
            Duration (days)
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-3 py-2 text-gray-900 dark:text-white"
            disabled={loading}
          >
            <option value={1}>1 day</option>
            <option value={3}>3 days</option>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
        </div>

        {/* Cost Breakdown */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
          <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Cost Breakdown</h3>
          <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
            <span className="font-medium">Premium:</span>
            <span className="font-mono">{ethers.formatUnits(premium, 6)} USDC</span>
          </div>
          {gasCost && (
            <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium">Gas (paid in USDC):</span>
              <span className="font-mono">{ethers.formatUnits(gasCost.gasCostUSDC, 6)} USDC</span>
            </div>
          )}
          <div className="border-t border-gray-300 dark:border-gray-700 pt-2 mt-2">
            <div className="flex justify-between font-bold text-gray-900 dark:text-white">
              <span>Total:</span>
              <span className="font-mono">{ethers.formatUnits(totalCost, 6)} USDC</span>
            </div>
          </div>
        </div>

        {/* Authorizations Status */}
        {!premiumAuth || !gasAuth ? (
          <button
            onClick={handleCreateAuthorizations}
            disabled={loading || !fillAmount || parseFloat(fillAmount) <= 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? 'Creating Authorizations...' : 'Create Authorizations'}
          </button>
        ) : (
          <div className="space-y-2">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 p-3 rounded-lg text-sm">
              <div className="font-semibold mb-1 text-green-800 dark:text-green-300">✓ Authorizations Created</div>
              <div className="text-xs text-gray-700 dark:text-gray-400 mb-1">
                Premium: {formatAuthorization(premiumAuth)}
              </div>
              <div className="text-xs text-gray-700 dark:text-gray-400">
                Gas: {formatAuthorization(gasAuth)}
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit Transaction'}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-3 rounded-lg text-sm text-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 p-3 rounded-lg text-xs text-blue-800 dark:text-blue-300">
          <div className="font-semibold mb-1">💡 Gasless Transaction</div>
          <div>
            You only pay in USDC (premium + ~$0.02 gas). No ETH needed!
            The backend relayer submits the transaction and gets reimbursed in USDC.
          </div>
        </div>
      </div>
    </div>
  );
}
