import { useState, useEffect } from 'react';
import { useBackend } from '@/hooks/useBackend';
import type { Position } from '@/hooks/useBackend';

export function PositionsList() {
  const { getPositions, settleOption } = useBackend();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settling, setSettling] = useState<string | null>(null);

  const fetchPositions = async () => {
    try {
      setLoading(true);
      const result = await getPositions();
      setPositions(result.positions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch positions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPositions, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSettle = async (tokenId: string) => {
    try {
      setSettling(tokenId);
      await settleOption({ tokenId });
      await fetchPositions(); // Refresh positions after settlement
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to settle option');
    } finally {
      setSettling(null);
    }
  };

  const isExpired = (expiryTime: number) => {
    return Date.now() / 1000 > expiryTime;
  };

  const getTimeRemaining = (expiryTime: number) => {
    const seconds = expiryTime - Date.now() / 1000;
    if (seconds <= 0) return 'Expired';

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading && positions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Positions</h2>
        <div className="text-center py-8 text-gray-500">Loading positions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Positions</h2>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Positions</h2>
        <div className="text-center py-12 text-gray-500">
          <p className="mb-2">No positions yet.</p>
          <p className="text-sm">Take some options from the orderbook to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Your Positions ({positions.length})
        </h2>
        <button
          onClick={fetchPositions}
          className="text-sm text-primary-600 hover:text-primary-700"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {positions.map((position) => (
          <div
            key={position.tokenId}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <span
                className={`px-2 py-1 text-xs font-medium rounded ${
                  position.isCall
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {position.isCall ? 'CALL' : 'PUT'}
              </span>
              <span className="text-xs text-gray-500">#{position.tokenId}</span>
            </div>

            {/* Token */}
            <div className="mb-2">
              <p className="text-xs text-gray-500">Token</p>
              <p className="text-sm font-mono">
                {position.underlying.slice(0, 8)}...{position.underlying.slice(-6)}
              </p>
            </div>

            {/* Collateral */}
            <div className="mb-2">
              <p className="text-xs text-gray-500">Collateral</p>
              <p className="text-sm font-medium">
                {(parseInt(position.collateralLocked) / 1e18).toFixed(4)}
              </p>
            </div>

            {/* Strike Price */}
            <div className="mb-2">
              <p className="text-xs text-gray-500">Strike Price</p>
              <p className="text-sm font-medium">
                ${(parseInt(position.strikePrice) / 1e8).toFixed(2)}
              </p>
            </div>

            {/* Time Remaining */}
            <div className="mb-3">
              <p className="text-xs text-gray-500">Time Remaining</p>
              <p className={`text-sm font-medium ${
                isExpired(position.expiryTime) ? 'text-red-600' : 'text-green-600'
              }`}>
                {getTimeRemaining(position.expiryTime)}
              </p>
            </div>

            {/* Actions */}
            {!position.settled && isExpired(position.expiryTime) && (
              <button
                onClick={() => handleSettle(position.tokenId)}
                disabled={settling === position.tokenId}
                className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white text-sm font-medium py-2 px-4 rounded transition-colors"
              >
                {settling === position.tokenId ? 'Settling...' : 'Settle Option'}
              </button>
            )}

            {position.settled && (
              <div className="w-full bg-gray-100 text-gray-600 text-sm font-medium py-2 px-4 rounded text-center">
                Settled
              </div>
            )}

            {!position.settled && !isExpired(position.expiryTime) && (
              <div className="w-full bg-blue-50 text-blue-700 text-sm font-medium py-2 px-4 rounded text-center">
                Active
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
