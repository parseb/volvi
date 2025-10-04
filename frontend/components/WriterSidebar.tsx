'use client';

import { useState } from 'react';
import { useAccount, useSignTypedData } from 'wagmi';
import { parseUnits, keccak256, encodeAbiParameters } from 'viem';
import { protocolAddress, chainId } from '@/lib/config';
import { submitOffer } from '@/lib/api';
import type { OptionOffer } from '@/lib/types';

export function WriterSidebar() {
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();

  const [formData, setFormData] = useState({
    underlying: '',
    collateralAmount: '',
    isCall: true,
    premiumPerDay: '',
    minDuration: 7,
    maxDuration: 365,
    minFillAmount: '',
    deadline: 30, // Days from now
  });

  const [status, setStatus] = useState<'idle' | 'signing' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      setErrorMsg('Please connect your wallet');
      return;
    }

    try {
      setStatus('signing');
      setErrorMsg('');

      // Build the offer
      const deadlineTimestamp = BigInt(Math.floor(Date.now() / 1000) + formData.deadline * 86400);
      const configHash = keccak256(encodeAbiParameters(
        [{ type: 'address' }],
        [formData.underlying as `0x${string}`]
      ));

      const offer: OptionOffer = {
        writer: address,
        underlying: formData.underlying as `0x${string}`,
        collateralAmount: parseUnits(formData.collateralAmount, 18),
        stablecoin: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`, // USDC on Base
        isCall: formData.isCall,
        premiumPerDay: parseUnits(formData.premiumPerDay, 6), // USDC has 6 decimals
        minDuration: formData.minDuration,
        maxDuration: formData.maxDuration,
        minFillAmount: parseUnits(formData.minFillAmount || formData.collateralAmount, 18),
        deadline: deadlineTimestamp,
        configHash,
      };

      // Sign with EIP-712
      const domain = {
        name: 'OptionsProtocol',
        version: '1',
        chainId: BigInt(chainId),
        verifyingContract: protocolAddress,
      };

      const types = {
        OptionOffer: [
          { name: 'writer', type: 'address' },
          { name: 'underlying', type: 'address' },
          { name: 'collateralAmount', type: 'uint256' },
          { name: 'stablecoin', type: 'address' },
          { name: 'isCall', type: 'bool' },
          { name: 'premiumPerDay', type: 'uint256' },
          { name: 'minDuration', type: 'uint16' },
          { name: 'maxDuration', type: 'uint16' },
          { name: 'minFillAmount', type: 'uint256' },
          { name: 'deadline', type: 'uint64' },
          { name: 'configHash', type: 'bytes32' },
        ],
      };

      const signature = await signTypedDataAsync({
        domain,
        types,
        primaryType: 'OptionOffer',
        message: offer,
      });

      // Submit to backend
      setStatus('submitting');
      await submitOffer(offer, signature);

      setStatus('success');
      // Reset form
      setFormData({
        underlying: '',
        collateralAmount: '',
        isCall: true,
        premiumPerDay: '',
        minDuration: 7,
        maxDuration: 365,
        minFillAmount: '',
        deadline: 30,
      });

      setTimeout(() => setStatus('idle'), 3000);
    } catch (error: any) {
      console.error('Failed to create offer:', error);
      setStatus('error');
      setErrorMsg(error.message || 'Failed to create offer');
    }
  };

  return (
    <div className="w-96 border-l p-6 bg-gray-50 dark:bg-gray-900">
      <h2 className="text-xl font-bold mb-4">Write Option</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Option Type */}
        <div>
          <label className="block text-sm font-medium mb-2">Option Type</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormData((f) => ({ ...f, isCall: true }))}
              className={`flex-1 py-2 rounded ${
                formData.isCall
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              CALL
            </button>
            <button
              type="button"
              onClick={() => setFormData((f) => ({ ...f, isCall: false }))}
              className={`flex-1 py-2 rounded ${
                !formData.isCall
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              PUT
            </button>
          </div>
        </div>

        {/* Underlying Token */}
        <div>
          <label className="block text-sm font-medium mb-2">Underlying Token Address</label>
          <input
            type="text"
            value={formData.underlying}
            onChange={(e) => setFormData((f) => ({ ...f, underlying: e.target.value }))}
            placeholder="0x..."
            className="w-full px-4 py-2 border rounded bg-white dark:bg-gray-800"
            required
          />
        </div>

        {/* Collateral Amount */}
        <div>
          <label className="block text-sm font-medium mb-2">Collateral Amount</label>
          <input
            type="number"
            value={formData.collateralAmount}
            onChange={(e) => setFormData((f) => ({ ...f, collateralAmount: e.target.value }))}
            placeholder="0.0"
            className="w-full px-4 py-2 border rounded bg-white dark:bg-gray-800"
            step="0.01"
            required
          />
        </div>

        {/* Premium Per Day */}
        <div>
          <label className="block text-sm font-medium mb-2">Premium Per Day (USDC)</label>
          <input
            type="number"
            value={formData.premiumPerDay}
            onChange={(e) => setFormData((f) => ({ ...f, premiumPerDay: e.target.value }))}
            placeholder="0.0"
            className="w-full px-4 py-2 border rounded bg-white dark:bg-gray-800"
            step="0.01"
            required
          />
        </div>

        {/* Duration Range */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium mb-2">Min Duration (days)</label>
            <input
              type="number"
              value={formData.minDuration}
              onChange={(e) => setFormData((f) => ({ ...f, minDuration: parseInt(e.target.value) }))}
              className="w-full px-4 py-2 border rounded bg-white dark:bg-gray-800"
              min="1"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Max Duration (days)</label>
            <input
              type="number"
              value={formData.maxDuration}
              onChange={(e) => setFormData((f) => ({ ...f, maxDuration: parseInt(e.target.value) }))}
              className="w-full px-4 py-2 border rounded bg-white dark:bg-gray-800"
              min={formData.minDuration}
              required
            />
          </div>
        </div>

        {/* Min Fill Amount (Optional) */}
        <div>
          <label className="block text-sm font-medium mb-2">Min Fill Amount (Optional)</label>
          <input
            type="number"
            value={formData.minFillAmount}
            onChange={(e) => setFormData((f) => ({ ...f, minFillAmount: e.target.value }))}
            placeholder="Same as collateral"
            className="w-full px-4 py-2 border rounded bg-white dark:bg-gray-800"
            step="0.01"
          />
        </div>

        {/* Deadline */}
        <div>
          <label className="block text-sm font-medium mb-2">Offer Valid For (days)</label>
          <input
            type="number"
            value={formData.deadline}
            onChange={(e) => setFormData((f) => ({ ...f, deadline: parseInt(e.target.value) }))}
            className="w-full px-4 py-2 border rounded bg-white dark:bg-gray-800"
            min="1"
            required
          />
        </div>

        {/* Submit Button */}
        {!isConnected ? (
          <button type="button" className="w-full py-3 bg-gray-400 text-white rounded cursor-not-allowed">
            Connect Wallet
          </button>
        ) : (
          <button
            type="submit"
            disabled={status === 'signing' || status === 'submitting'}
            className={`w-full py-3 rounded font-semibold ${
              status === 'signing' || status === 'submitting'
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : status === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {status === 'signing'
              ? 'Sign in Wallet...'
              : status === 'submitting'
              ? 'Submitting...'
              : status === 'success'
              ? 'Success!'
              : 'Create Offer'}
          </button>
        )}

        {/* Error Message */}
        {status === 'error' && errorMsg && (
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded text-red-700 dark:text-red-300 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-gray-500 mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
          <p className="font-semibold mb-1">Remember:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Approve the protocol to spend your tokens</li>
            <li>Collateral is locked when someone takes your offer</li>
            <li>You can cancel by revoking approval</li>
          </ul>
        </div>
      </form>
    </div>
  );
}
