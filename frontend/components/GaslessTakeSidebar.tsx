'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { ethers } from 'ethers';
import {
  createGaslessAuthorizations,
  estimateGasCost,
  verifyAuthorizationValidity,
  formatAuthorization,
  type EIP3009Authorization
} from '../lib/eip3009';

interface OptionOffer {
  writer: string;
  underlying: string;
  strike: string;
  premium: string;
  optionType: number;
  oracle: string;
  expiry: number;
  nonce: string;
  signature?: string;
  offerHash?: string;
}

interface GaslessTakeSidebarProps {
  offer: OptionOffer | null;
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
    const premiumPerDay = BigInt(offer.premium);

    // Premium = (fillAmount * premiumPerDay * duration) / 1e18
    return (fillAmountBigInt * premiumPerDay * BigInt(duration)) / BigInt(1e18);
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
          offer: {
            writer: offer.writer,
            underlying: offer.underlying,
            strike: offer.strike,
            premium: offer.premium,
            optionType: offer.optionType,
            oracle: offer.oracle,
            expiry: offer.expiry,
            nonce: offer.nonce
          },
          offerSignature: offer.signature || '',
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
    <div className="fixed right-0 top-0 h-full w-96 bg-gray-900 border-l border-gray-700 p-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Take Option (Gasless)</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          ✕
        </button>
      </div>

      <div className="space-y-4">
        {/* Offer Details */}
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="font-semibold mb-2">Offer Details</h3>
          <div className="text-sm space-y-1 text-gray-300">
            <div>Writer: {offer.writer.slice(0, 6)}...{offer.writer.slice(-4)}</div>
            <div>Type: {offer.optionType === 1 ? 'Call' : 'Put'}</div>
            <div>Strike: ${ethers.formatUnits(offer.strike, 6)}</div>
            <div>Premium: {ethers.formatUnits(offer.premium, 18)} USDC/day</div>
          </div>
        </div>

        {/* Fill Amount */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Fill Amount (underlying tokens)
          </label>
          <input
            type="number"
            value={fillAmount}
            onChange={(e) => setFillAmount(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
            placeholder="0.0"
            disabled={loading}
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Duration (days)
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
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
        <div className="bg-gray-800 p-4 rounded space-y-2">
          <h3 className="font-semibold mb-2">Cost Breakdown</h3>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Premium:</span>
            <span>{ethers.formatUnits(premium, 6)} USDC</span>
          </div>
          {gasCost && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Gas (paid in USDC):</span>
              <span>{ethers.formatUnits(gasCost.gasCostUSDC, 6)} USDC</span>
            </div>
          )}
          <div className="border-t border-gray-700 pt-2 mt-2">
            <div className="flex justify-between font-semibold">
              <span>Total:</span>
              <span>{ethers.formatUnits(totalCost, 6)} USDC</span>
            </div>
          </div>
        </div>

        {/* Authorizations Status */}
        {!premiumAuth || !gasAuth ? (
          <button
            onClick={handleCreateAuthorizations}
            disabled={loading || !fillAmount || parseFloat(fillAmount) <= 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded"
          >
            {loading ? 'Creating Authorizations...' : 'Create Authorizations'}
          </button>
        ) : (
          <div className="space-y-2">
            <div className="bg-green-900 border border-green-700 p-3 rounded text-sm">
              <div className="font-semibold mb-1">✓ Authorizations Created</div>
              <div className="text-xs text-gray-300 mb-1">
                Premium: {formatAuthorization(premiumAuth)}
              </div>
              <div className="text-xs text-gray-300">
                Gas: {formatAuthorization(gasAuth)}
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded"
            >
              {loading ? 'Submitting...' : 'Submit Transaction'}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900 border border-red-700 p-3 rounded text-sm">
            {error}
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-900 border border-blue-700 p-3 rounded text-xs text-gray-300">
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
