'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { PositionCard } from '@/components/PositionCard';
import { getPositions } from '@/lib/api';
import type { Position } from '@/lib/types';

export default function Portfolio() {
  const { address, isConnected } = useAccount();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');

  useEffect(() => {
    if (!isConnected || !address) {
      setPositions([]);
      return;
    }

    const fetchPositions = async () => {
      try {
        setLoading(true);
        const data = await getPositions(address);
        setPositions(data);
      } catch (error) {
        console.error('Failed to fetch positions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();
    const interval = setInterval(fetchPositions, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [address, isConnected]);

  const filteredPositions = positions.filter((pos) => {
    const isExpired = pos.option.expiryTime < BigInt(Math.floor(Date.now() / 1000));
    if (filter === 'active') return !isExpired && !pos.option.settled;
    if (filter === 'expired') return isExpired || pos.option.settled;
    return true;
  });

  const totalPnL = positions.reduce((sum, pos) => {
    if (pos.pnl) return sum + Number(pos.pnl);
    return sum;
  }, 0);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Portfolio</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Your active option positions</p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/"
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Orderbook
              </a>
              <w3m-button />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {!isConnected ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Connect your wallet to view your positions
            </p>
            <w3m-button />
          </div>
        ) : loading ? (
          <div className="text-center py-12">Loading positions...</div>
        ) : positions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 mb-4">You don't have any positions yet</p>
            <a href="/" className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700">
              Explore Options
            </a>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Total Positions</p>
                <p className="text-3xl font-bold">{positions.length}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Active Positions</p>
                <p className="text-3xl font-bold">
                  {
                    positions.filter(
                      (p) =>
                        p.option.expiryTime >= BigInt(Math.floor(Date.now() / 1000)) && !p.option.settled
                    ).length
                  }
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Total P&L</p>
                <p
                  className={`text-3xl font-bold ${
                    totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {totalPnL >= 0 ? '+' : ''}
                  {totalPnL.toFixed(2)} USDC
                </p>
              </div>
            </div>

            {/* Filter */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                All ({positions.length})
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-4 py-2 rounded ${
                  filter === 'active'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Active (
                {
                  positions.filter(
                    (p) =>
                      p.option.expiryTime >= BigInt(Math.floor(Date.now() / 1000)) && !p.option.settled
                  ).length
                }
                )
              </button>
              <button
                onClick={() => setFilter('expired')}
                className={`px-4 py-2 rounded ${
                  filter === 'expired'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Expired/Settled (
                {
                  positions.filter(
                    (p) =>
                      p.option.expiryTime < BigInt(Math.floor(Date.now() / 1000)) || p.option.settled
                  ).length
                }
                )
              </button>
            </div>

            {/* Positions Grid */}
            {filteredPositions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No positions match the selected filter
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPositions.map((position) => (
                  <PositionCard key={position.option.tokenId.toString()} position={position} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
