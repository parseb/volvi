import { useState } from 'react';
import { useBackend } from '@/hooks/useBackend';
import type { OptionOffer } from '@/hooks/useBackend';

interface TakeOptionModalProps {
  offer: {
    offerHash: string;
    offer: OptionOffer;
    signature: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TakeOptionModal({ offer, isOpen, onClose, onSuccess }: TakeOptionModalProps) {
  const { takeOption } = useBackend();

  const [duration, setDuration] = useState(offer.offer.minDuration.toString());
  const [fillAmount, setFillAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const durationDays = parseInt(duration);
      const fillAmountWei = (parseFloat(fillAmount) * 1e18).toString();
      const premiumAmount = (
        (parseFloat(offer.offer.premiumPerDay) / 1e6) * durationDays
      ).toString();

      // EIP-3009 authorization parameters
      // These would need to be obtained from the user's wallet
      // For now, using placeholder values
      const validAfter = 0;
      const validBefore = Math.floor(Date.now() / 1000) + 3600; // 1 hour
      const nonce = '0x' + Array(64).fill('0').join(''); // Placeholder

      const result = await takeOption({
        offerHash: offer.offerHash,
        offer: offer.offer,
        signature: offer.signature,
        duration: durationDays,
        fillAmount: fillAmountWei,
        validAfter,
        validBefore,
        nonce,
        v: 27, // Placeholder
        r: '0x' + Array(64).fill('0').join(''), // Placeholder
        s: '0x' + Array(64).fill('0').join(''), // Placeholder
      });

      if (result.success) {
        onSuccess?.();
        onClose();
      } else {
        setError(result.error || 'Failed to take option');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to take option');
    } finally {
      setLoading(false);
    }
  };

  const calculatePremium = () => {
    if (!duration || !fillAmount) return 0;
    const durationDays = parseInt(duration);
    const premiumPerDay = parseFloat(offer.offer.premiumPerDay) / 1e6;
    return (premiumPerDay * durationDays).toFixed(2);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Take Option</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Offer Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Type:</span>
              <span className={`text-sm font-medium ${offer.offer.isCall ? 'text-green-700' : 'text-red-700'}`}>
                {offer.offer.isCall ? 'CALL' : 'PUT'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Token:</span>
              <span className="text-sm font-mono">
                {offer.offer.underlying.slice(0, 6)}...{offer.offer.underlying.slice(-4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Available:</span>
              <span className="text-sm font-medium">
                {(parseInt(offer.offer.collateralAmount) / 1e18).toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Premium/Day:</span>
              <span className="text-sm font-medium">
                {(parseInt(offer.offer.premiumPerDay) / 1e6).toFixed(2)} USDC
              </span>
            </div>
          </div>

          {/* Duration Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (days)
            </label>
            <input
              type="number"
              min={offer.offer.minDuration}
              max={offer.offer.maxDuration}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Range: {offer.offer.minDuration}-{offer.offer.maxDuration} days
            </p>
          </div>

          {/* Fill Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount to Take
            </label>
            <input
              type="number"
              step="0.0001"
              value={fillAmount}
              onChange={(e) => setFillAmount(e.target.value)}
              placeholder="0.0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Min: {(parseInt(offer.offer.minFillAmount) / 1e18).toFixed(4)}
            </p>
          </div>

          {/* Premium Calculation */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Total Premium:</span>
              <span className="text-lg font-bold text-primary-700">
                {calculatePremium()} USDC
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              {loading ? 'Taking...' : 'Take Option'}
            </button>
          </div>

          {/* Note */}
          <p className="text-xs text-gray-500 text-center">
            This transaction is gasless. You'll only pay the premium in USDC.
          </p>
        </form>
      </div>
    </div>
  );
}
