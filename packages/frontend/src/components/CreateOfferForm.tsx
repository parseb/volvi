import { useState } from 'react';
import { useBackend } from '@/hooks/useBackend';

export function CreateOfferForm() {
  const { createOffer } = useBackend();

  // Form state
  const [profileId, setProfileId] = useState('');
  const [underlying, setUnderlying] = useState('');
  const [collateralAmount, setCollateralAmount] = useState('');
  const [isCall, setIsCall] = useState(true);
  const [premiumPerDay, setPremiumPerDay] = useState('');
  const [minDuration, setMinDuration] = useState('1');
  const [maxDuration, setMaxDuration] = useState('30');
  const [minFillAmount, setMinFillAmount] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // TODO: Get these from config or environment
      const stablecoinAddress = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // USDC on Sepolia
      const configHash = '0x0000000000000000000000000000000000000000000000000000000000000000';

      // Convert amounts to wei/contract units
      const collateralAmountWei = (parseFloat(collateralAmount) * 1e18).toString();
      const premiumPerDayWei = (parseFloat(premiumPerDay) * 1e6).toString(); // USDC has 6 decimals
      const minFillAmountWei = (parseFloat(minFillAmount) * 1e18).toString();

      // Deadline: 1 hour from now
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      const result = await createOffer({
        profileId,
        underlying,
        collateralAmount: collateralAmountWei,
        stablecoin: stablecoinAddress,
        isCall,
        premiumPerDay: premiumPerDayWei,
        minDuration: parseInt(minDuration),
        maxDuration: parseInt(maxDuration),
        minFillAmount: minFillAmountWei,
        deadline,
        configHash,
      });

      if (result.success) {
        setSuccess(`Offer created! Hash: ${result.data.offerHash}`);
        // Reset form
        setProfileId('');
        setUnderlying('');
        setCollateralAmount('');
        setPremiumPerDay('');
        setMinDuration('1');
        setMaxDuration('30');
        setMinFillAmount('');
      } else {
        setError(result.error || 'Failed to create offer');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Option Offer</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Profile ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Profile ID
          </label>
          <input
            type="text"
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            placeholder="0x..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Your liquidity profile hash
          </p>
        </div>

        {/* Option Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Option Type
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                checked={isCall}
                onChange={() => setIsCall(true)}
                className="mr-2"
              />
              <span className="text-sm">Call</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={!isCall}
                onChange={() => setIsCall(false)}
                className="mr-2"
              />
              <span className="text-sm">Put</span>
            </label>
          </div>
        </div>

        {/* Underlying Token */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Underlying Token Address
          </label>
          <input
            type="text"
            value={underlying}
            onChange={(e) => setUnderlying(e.target.value)}
            placeholder="0x..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>

        {/* Collateral Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Collateral Amount
          </label>
          <input
            type="number"
            step="0.0001"
            value={collateralAmount}
            onChange={(e) => setCollateralAmount(e.target.value)}
            placeholder="0.0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Amount of underlying token to lock
          </p>
        </div>

        {/* Premium Per Day */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Premium Per Day (USDC)
          </label>
          <input
            type="number"
            step="0.01"
            value={premiumPerDay}
            onChange={(e) => setPremiumPerDay(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>

        {/* Duration Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Duration (days)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={minDuration}
              onChange={(e) => setMinDuration(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Duration (days)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={maxDuration}
              onChange={(e) => setMaxDuration(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
        </div>

        {/* Min Fill Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Minimum Fill Amount
          </label>
          <input
            type="number"
            step="0.0001"
            value={minFillAmount}
            onChange={(e) => setMinFillAmount(e.target.value)}
            placeholder="0.0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Minimum amount that can be taken
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded transition-colors"
        >
          {loading ? 'Creating Offer...' : 'Create Offer'}
        </button>
      </form>
    </div>
  );
}
