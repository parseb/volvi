'use client';

import { formatEther, formatUnits } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { protocolAddress } from '@/lib/config';
import optionsAbi from '@/lib/OptionsProtocol.abi.json';
import type { Position } from '@/lib/types';

interface PositionCardProps {
  position: Position;
  onSettle?: () => void;
}

export function PositionCard({ position, onSettle }: PositionCardProps) {
  const { option, currentPrice, pnl } = position;

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleSettle = async () => {
    if (onSettle) {
      // Use gasless settlement dialog
      onSettle();
    } else {
      // Fallback to direct settlement (legacy)
      try {
        writeContract({
          address: protocolAddress,
          abi: optionsAbi,
          functionName: 'settleOption',
          args: [option.tokenId],
        });
      } catch (error) {
        console.error('Failed to settle option:', error);
      }
    }
  };

  const isExpired = option.expiryTime < BigInt(Math.floor(Date.now() / 1000));
  const canSettle = !option.settled; // Taker can settle/close at any time

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  const formatPnL = (pnlValue?: bigint) => {
    if (!pnlValue) return 'N/A';
    const value = parseFloat(formatUnits(pnlValue, 6)); // Assuming USDC
    const isPositive = value >= 0;
    return (
      <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
        {isPositive ? '+' : ''}
        {value.toFixed(2)} USDC
      </span>
    );
  };

  return (
    <div className="border rounded-lg p-6 bg-white dark:bg-gray-800">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold">Option #{option.tokenId.toString()}</h3>
          <span
            className={`inline-block px-2 py-1 rounded text-sm mt-1 ${
              option.isCall
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}
          >
            {option.isCall ? 'CALL' : 'PUT'}
          </span>
        </div>
        {option.settled ? (
          <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm">Settled</span>
        ) : isExpired ? (
          <span className="px-3 py-1 bg-orange-200 dark:bg-orange-900 rounded text-sm">Expired</span>
        ) : (
          <span className="px-3 py-1 bg-blue-200 dark:bg-blue-900 rounded text-sm">Active</span>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Underlying:</span>
          <span className="font-mono text-sm">{option.underlying.slice(0, 6)}...{option.underlying.slice(-4)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Collateral:</span>
          <span>{formatEther(option.collateralLocked)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Strike Price:</span>
          <span>${formatUnits(option.strikePrice, 8)}</span>
        </div>

        {currentPrice && (
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Current Price:</span>
            <span>${formatUnits(currentPrice, 8)}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Start Date:</span>
          <span>{formatDate(option.startTime)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Expiry Date:</span>
          <span>{formatDate(option.expiryTime)}</span>
        </div>

        {pnl !== undefined && (
          <div className="flex justify-between pt-2 border-t">
            <span className="text-gray-600 dark:text-gray-400 font-semibold">P&L:</span>
            <span className="font-semibold">{formatPnL(pnl)}</span>
          </div>
        )}
      </div>

      {canSettle && (
        <button
          onClick={handleSettle}
          disabled={isPending || isConfirming || isSuccess}
          className={`w-full py-2 rounded font-semibold ${
            isPending || isConfirming
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : isSuccess
              ? 'bg-green-600 text-white'
              : isExpired
              ? 'bg-orange-600 text-white hover:bg-orange-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isPending || isConfirming
            ? 'Processing...'
            : isSuccess
            ? 'Settled!'
            : isExpired
            ? '⚡ Settle Expired Option'
            : '⚡ Close Position (Settle)'}
        </button>
      )}

      {isSuccess && (
        <div className="mt-3 bg-green-50 dark:bg-green-900/20 p-2 rounded text-center text-green-700 dark:text-green-300 text-sm">
          Option settled successfully!
        </div>
      )}
    </div>
  );
}
