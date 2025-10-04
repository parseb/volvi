'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatEther } from 'viem';
import { protocolAddress } from '@/lib/config';
import optionsAbi from '@/lib/OptionsProtocol.abi.json';
import type { OrderbookOffer } from '@/lib/types';

interface TakerSidebarProps {
  offer: OrderbookOffer | null;
  onClose: () => void;
}

export function TakerSidebar({ offer, onClose }: TakerSidebarProps) {
  const { address, isConnected } = useAccount();
  const [duration, setDuration] = useState(7); // Default 7 days
  const [fillAmount, setFillAmount] = useState('');

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  if (!offer) {
    return (
      <div className="w-96 border-l p-6 bg-gray-50 dark:bg-gray-900">
        <h2 className="text-xl font-bold mb-4">Take Option</h2>
        <p className="text-gray-500">Select an offer from the orderbook to get started</p>
      </div>
    );
  }

  const calculatePremium = () => {
    if (!fillAmount || parseFloat(fillAmount) === 0) return BigInt(0);
    const amount = parseUnits(fillAmount, 18);
    return (offer.offer.premiumPerDay * BigInt(duration) * amount) / offer.offer.collateralAmount;
  };

  const premium = calculatePremium();

  const handleTake = async () => {
    if (!isConnected || !fillAmount) return;

    try {
      const amount = parseUnits(fillAmount, 18);

      writeContract({
        address: protocolAddress,
        abi: optionsAbi,
        functionName: 'takeOption',
        args: [offer.offer, offer.signature, amount, duration],
      });
    } catch (error) {
      console.error('Failed to take option:', error);
    }
  };

  const isValidFill =
    fillAmount &&
    parseUnits(fillAmount, 18) >= offer.offer.minFillAmount &&
    parseUnits(fillAmount, 18) <= offer.remainingAmount;

  const isValidDuration = duration >= offer.offer.minDuration && duration <= offer.offer.maxDuration;

  return (
    <div className="w-96 border-l p-6 bg-gray-50 dark:bg-gray-900">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Take Option</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          ✕
        </button>
      </div>

      <div className="space-y-4">
        {/* Offer Details */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Type:</span>
            <span className="font-semibold">{offer.offer.isCall ? 'CALL' : 'PUT'}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Available:</span>
            <span>{formatEther(offer.remainingAmount)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Premium/Day:</span>
            <span>{formatEther(offer.offer.premiumPerDay)} USDC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Duration Range:</span>
            <span>
              {offer.offer.minDuration}-{offer.offer.maxDuration} days
            </span>
          </div>
        </div>

        {/* Fill Amount */}
        <div>
          <label className="block text-sm font-medium mb-2">Fill Amount</label>
          <input
            type="number"
            value={fillAmount}
            onChange={(e) => setFillAmount(e.target.value)}
            placeholder="0.0"
            className="w-full px-4 py-2 border rounded bg-white dark:bg-gray-800"
            step="0.01"
            min={formatEther(offer.offer.minFillAmount)}
            max={formatEther(offer.remainingAmount)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Min: {formatEther(offer.offer.minFillAmount)} | Max: {formatEther(offer.remainingAmount)}
          </p>
          {fillAmount && !isValidFill && (
            <p className="text-xs text-red-500 mt-1">Invalid fill amount</p>
          )}
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium mb-2">Duration (days): {duration}</label>
          <input
            type="range"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            min={offer.offer.minDuration}
            max={offer.offer.maxDuration}
            className="w-full"
          />
          {!isValidDuration && (
            <p className="text-xs text-red-500 mt-1">Duration out of range</p>
          )}
        </div>

        {/* Premium Display */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Premium:</span>
            <span className="text-2xl font-bold">{formatEther(premium)} USDC</span>
          </div>
        </div>

        {/* Take Button */}
        {!isConnected ? (
          <button className="w-full py-3 bg-gray-400 text-white rounded cursor-not-allowed">
            Connect Wallet
          </button>
        ) : (
          <button
            onClick={handleTake}
            disabled={!isValidFill || !isValidDuration || isPending || isConfirming}
            className={`w-full py-3 rounded font-semibold ${
              isValidFill && isValidDuration && !isPending && !isConfirming
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-400 text-white cursor-not-allowed'
            }`}
          >
            {isPending || isConfirming ? 'Taking Option...' : isSuccess ? 'Success!' : 'Take Option'}
          </button>
        )}

        {isSuccess && (
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded text-center text-green-700 dark:text-green-300">
            Option taken successfully!
          </div>
        )}
      </div>
    </div>
  );
}
