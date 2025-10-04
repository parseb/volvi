'use client';

import { useState, useEffect } from 'react';
import { formatEther, formatUnits } from 'viem';
import { getOrderbook } from '@/lib/api';
import type { OrderbookOffer } from '@/lib/types';

interface OrderbookProps {
  token: string;
  onSelectOffer?: (offer: OrderbookOffer) => void;
}

export function Orderbook({ token, onSelectOffer }: OrderbookProps) {
  const [offers, setOffers] = useState<OrderbookOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{ isCall?: boolean; minDuration?: number; maxDuration?: number }>({});

  useEffect(() => {
    const fetchOrderbook = async () => {
      try {
        setLoading(true);
        const data = await getOrderbook(token, filter.isCall, filter.minDuration, filter.maxDuration);
        setOffers(data);
      } catch (error) {
        console.error('Failed to fetch orderbook:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderbook();
    const interval = setInterval(fetchOrderbook, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [token, filter]);

  const formatPremium = (premium: bigint) => {
    return parseFloat(formatUnits(premium, 6)).toFixed(2); // Assuming USDC (6 decimals)
  };

  const formatAmount = (amount: bigint) => {
    return parseFloat(formatEther(amount)).toFixed(4);
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex gap-4">
        <select
          value={filter.isCall === undefined ? 'all' : filter.isCall ? 'call' : 'put'}
          onChange={(e) =>
            setFilter((f) => ({
              ...f,
              isCall: e.target.value === 'all' ? undefined : e.target.value === 'call',
            }))
          }
          className="px-4 py-2 border rounded bg-white dark:bg-gray-800"
        >
          <option value="all">All Options</option>
          <option value="call">Calls Only</option>
          <option value="put">Puts Only</option>
        </select>

        <input
          type="number"
          placeholder="Min Duration (days)"
          value={filter.minDuration || ''}
          onChange={(e) =>
            setFilter((f) => ({ ...f, minDuration: e.target.value ? parseInt(e.target.value) : undefined }))
          }
          className="px-4 py-2 border rounded bg-white dark:bg-gray-800"
        />

        <input
          type="number"
          placeholder="Max Duration (days)"
          value={filter.maxDuration || ''}
          onChange={(e) =>
            setFilter((f) => ({ ...f, maxDuration: e.target.value ? parseInt(e.target.value) : undefined }))
          }
          className="px-4 py-2 border rounded bg-white dark:bg-gray-800"
        />
      </div>

      {loading ? (
        <div className="text-center py-8">Loading orderbook...</div>
      ) : offers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No offers available</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">Type</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-right p-3">Premium/Day</th>
                <th className="text-right p-3">Duration</th>
                <th className="text-right p-3">Total Premium</th>
                <th className="text-right p-3">Filled</th>
                <th className="text-center p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((orderOffer) => (
                <tr
                  key={orderOffer.offerHash}
                  className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => onSelectOffer?.(orderOffer)}
                >
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        orderOffer.offer.isCall
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                    >
                      {orderOffer.offer.isCall ? 'CALL' : 'PUT'}
                    </span>
                  </td>
                  <td className="text-right p-3">{formatAmount(orderOffer.remainingAmount)}</td>
                  <td className="text-right p-3">{formatPremium(orderOffer.offer.premiumPerDay)} USDC</td>
                  <td className="text-right p-3">
                    {orderOffer.offer.minDuration}-{orderOffer.offer.maxDuration}d
                  </td>
                  <td className="text-right p-3 font-semibold">{formatPremium(orderOffer.totalPremium)} USDC</td>
                  <td className="text-right p-3">
                    {((Number(orderOffer.filledAmount) / Number(orderOffer.offer.collateralAmount)) * 100).toFixed(1)}%
                  </td>
                  <td className="text-center p-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectOffer?.(orderOffer);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Take
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
