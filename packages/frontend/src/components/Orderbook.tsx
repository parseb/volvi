import { useState, useEffect } from 'react';
import { useBackend } from '@/hooks/useBackend';
import type { OptionOffer } from '@/hooks/useBackend';
import { TakeOptionModal } from './TakeOptionModal';

interface OrderbookOffer {
  offerHash: string;
  offer: OptionOffer;
  signature: string;
  filledAmount?: string;
}

export function Orderbook() {
  const { getOrderbook } = useBackend();
  const [offers, setOffers] = useState<OrderbookOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<OrderbookOffer | null>(null);

  const fetchOrderbook = async () => {
    try {
      setLoading(true);
      const result = await getOrderbook();
      setOffers(result.offers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orderbook');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderbook();
    // Refresh every 30 seconds
    const interval = setInterval(fetchOrderbook, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && offers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Orderbook</h2>
        <div className="text-center py-8 text-gray-500">Loading offers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Orderbook</h2>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Orderbook</h2>
        <div className="text-center py-12 text-gray-500">
          <p className="mb-2">No active offers yet.</p>
          <p className="text-sm">Create a profile and write some options to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Orderbook ({offers.length} offers)
        </h2>
        <button
          onClick={fetchOrderbook}
          className="text-sm text-primary-600 hover:text-primary-700"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Token
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Premium/Day
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Duration
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {offers.map((item) => (
              <tr key={item.offerHash} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      item.offer.isCall
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {item.offer.isCall ? 'CALL' : 'PUT'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-mono">
                  {item.offer.underlying.slice(0, 6)}...{item.offer.underlying.slice(-4)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {(parseInt(item.offer.collateralAmount) / 1e18).toFixed(4)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {(parseInt(item.offer.premiumPerDay) / 1e6).toFixed(2)} USDC
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {item.offer.minDuration}-{item.offer.maxDuration}d
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    onClick={() => setSelectedOffer(item)}
                  >
                    Take
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Take Option Modal */}
      {selectedOffer && (
        <TakeOptionModal
          offer={selectedOffer}
          isOpen={true}
          onClose={() => setSelectedOffer(null)}
          onSuccess={fetchOrderbook}
        />
      )}
    </div>
  );
}
