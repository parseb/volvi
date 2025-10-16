'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { PositionCard } from '@/components/PositionCard';
import SettlementDialog from '@/components/SettlementDialog';
import { getPositions, getUserOffers } from '@/lib/api';
import { chainId } from '@/lib/config';
import type { Position, OrderbookOffer } from '@/lib/types';
import { formatUnits } from 'viem';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [positions, setPositions] = useState<Position[]>([]);
  const [offers, setOffers] = useState<OrderbookOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'positions' | 'offers'>('positions');
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [settlementPosition, setSettlementPosition] = useState<Position | null>(null);

  const handleCancelOffer = async (offerHash: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/offers/${offerHash}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel offer');
      }

      // Remove offer from local state
      setOffers((prev) => prev.filter((o) => o.offerHash !== offerHash));
      alert('Offer cancelled successfully!');
    } catch (error) {
      console.error('Failed to cancel offer:', error);
      alert('Failed to cancel offer. Please try again.');
    }
  };

  useEffect(() => {
    if (!isConnected || !address) {
      setPositions([]);
      setOffers([]);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [positionsData, offersData] = await Promise.all([
          getPositions(address),
          getUserOffers(address),
        ]);
        setPositions(positionsData);
        setOffers(offersData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [address, isConnected]);

  const filteredPositions = positions.filter((pos) => {
    const isExpired = pos.option.expiryTime < BigInt(Math.floor(Date.now() / 1000));
    if (filter === 'active') return !isExpired && !pos.option.settled;
    if (filter === 'expired') return isExpired || pos.option.settled;
    return true;
  });

  const filteredOffers = offers.filter((offer) => {
    const isExpired = offer.deadline < BigInt(Math.floor(Date.now() / 1000));
    const isFilled = offer.remainingAmount === BigInt(0);
    if (filter === 'active') return !isExpired && !isFilled;
    if (filter === 'expired') return isExpired || isFilled;
    return true;
  });

  const totalPnL = positions.reduce((sum, pos) => {
    if (pos.pnl) return sum + Number(pos.pnl);
    return sum;
  }, 0);

  const totalOfferValue = offers.reduce((sum, offer) => {
    return sum + Number(formatUnits(offer.remainingAmount, 18));
  }, 0);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Manage your positions and offers</p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/"
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Trading
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
              Connect your wallet to view your dashboard
            </p>
            <w3m-button />
          </div>
        ) : loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Total Positions</p>
                <p className="text-3xl font-bold">{positions.length}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Active Offers</p>
                <p className="text-3xl font-bold">
                  {
                    offers.filter(
                      (o) =>
                        o.deadline >= BigInt(Math.floor(Date.now() / 1000)) &&
                        o.remainingAmount > BigInt(0)
                    ).length
                  }
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Offer Liquidity</p>
                <p className="text-3xl font-bold">{totalOfferValue.toFixed(2)}</p>
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

            {/* Tab Selector */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab('positions')}
                className={`px-6 py-3 rounded ${
                  activeTab === 'positions'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                My Positions ({positions.length})
              </button>
              <button
                onClick={() => setActiveTab('offers')}
                className={`px-6 py-3 rounded ${
                  activeTab === 'offers'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                My Offers ({offers.length})
              </button>
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
                All
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-4 py-2 rounded ${
                  filter === 'active'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilter('expired')}
                className={`px-4 py-2 rounded ${
                  filter === 'expired'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Expired/Filled
              </button>
            </div>

            {/* Content */}
            {activeTab === 'positions' ? (
              positions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">You don't have any positions yet</p>
                  <a href="/" className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Explore Options
                  </a>
                </div>
              ) : filteredPositions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No positions match the selected filter
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPositions.map((position) => (
                    <PositionCard
                      key={position.option.tokenId.toString()}
                      position={position}
                      onSettle={() => setSettlementPosition(position)}
                    />
                  ))}
                </div>
              )
            ) : offers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400 mb-4">You haven't written any offers yet</p>
                <a href="/" className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Write an Offer
                </a>
              </div>
            ) : filteredOffers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No offers match the selected filter
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOffers.map((offer) => (
                  <OfferCard key={offer.offerHash} offer={offer} onCancel={handleCancelOffer} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Settlement Dialog */}
      {settlementPosition && (
        <SettlementDialog
          tokenId={settlementPosition.option.tokenId.toString()}
          option={{
            underlying: settlementPosition.option.underlying,
            strikePrice: settlementPosition.option.strikePrice.toString(),
            amount: settlementPosition.option.collateralLocked.toString(),
            optionType: settlementPosition.option.isCall ? 1 : 0,
            expiry: Number(settlementPosition.option.expiryTime),
            payout: '0' // TODO: Calculate payout
          }}
          onClose={() => setSettlementPosition(null)}
          onSuccess={(orderUid) => {
            console.log('Settlement order submitted:', orderUid);
            setSettlementPosition(null);
          }}
          backendUrl={BACKEND_URL}
          chainId={chainId}
        />
      )}
    </div>
  );
}

// Offer Card Component
function OfferCard({ offer, onCancel }: { offer: OrderbookOffer; onCancel: (offerHash: string) => void }) {
  const [canceling, setCanceling] = useState(false);
  const isExpired = offer.deadline < BigInt(Math.floor(Date.now() / 1000));
  const isFilled = offer.remainingAmount === BigInt(0);
  const fillPercentage = offer.filledAmount > 0
    ? Number((offer.filledAmount * BigInt(100)) / offer.collateralAmount)
    : 0;

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this offer?')) return;
    setCanceling(true);
    try {
      await onCancel(offer.offerHash);
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border rounded-lg p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold">
            {offer.isCall ? '🟢 CALL' : '🔴 PUT'}
          </h3>
          <p className="text-sm text-gray-500">
            {offer.underlying.slice(0, 6)}...{offer.underlying.slice(-4)}
          </p>
        </div>
        <div
          className={`px-2 py-1 rounded text-xs ${
            isExpired || isFilled
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              : 'bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-200'
          }`}
        >
          {isFilled ? 'FILLED' : isExpired ? 'EXPIRED' : 'ACTIVE'}
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Collateral:</span>
          <span className="font-semibold">{formatUnits(offer.collateralAmount, 18)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Premium/Day:</span>
          <span className="font-semibold">{formatUnits(offer.premiumPerDay, 6)} USDC</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Duration:</span>
          <span className="font-semibold">
            {offer.minDuration}-{offer.maxDuration} days
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Filled:</span>
          <span className="font-semibold">{fillPercentage.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Remaining:</span>
          <span className="font-semibold">{formatUnits(offer.remainingAmount, 18)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Expires:</span>
          <span className="font-semibold">
            {new Date(Number(offer.deadline) * 1000).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${fillPercentage}%` }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      {!isFilled && (
        <div className="mt-4 flex gap-2">
          {!isExpired && (
            <button
              onClick={handleCancel}
              disabled={canceling}
              className={`flex-1 py-2 px-4 rounded font-semibold ${
                canceling
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {canceling ? 'Canceling...' : 'Cancel Offer'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
