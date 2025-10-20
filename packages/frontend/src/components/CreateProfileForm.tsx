import { useState } from 'react';
import { useBackend } from '@/hooks/useBackend';
import type { CreateProfileRequest } from '@/hooks/useBackend';

export function CreateProfileForm() {
  const { createProfile } = useBackend();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    totalUSDC: '',
    maxLockDays: 30,
    minUnit: '0.001',
    minPremium: '0.01',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Convert to wei/contract units
      const totalUSDCWei = (parseFloat(formData.totalUSDC) * 1e6).toString(); // USDC has 6 decimals
      const minUnitWei = (parseFloat(formData.minUnit) * 1e18).toString(); // Assume 18 decimals for tokens
      const minPremiumWei = (parseFloat(formData.minPremium) * 1e6).toString(); // USDC has 6 decimals

      const params: CreateProfileRequest = {
        totalUSDC: totalUSDCWei,
        maxLockDays: formData.maxLockDays,
        minUnit: minUnitWei,
        minPremium: minPremiumWei,
        usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC address (update for testnet)
      };

      const result = await createProfile(params);
      setSuccess(`Profile created! Profile ID: ${result.profileId.slice(0, 10)}...`);

      // Reset form
      setFormData({
        totalUSDC: '',
        maxLockDays: 30,
        minUnit: '0.001',
        minPremium: '0.01',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Create Liquidity Profile
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Total USDC */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total USDC to Deposit
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={formData.totalUSDC}
            onChange={(e) => setFormData({ ...formData, totalUSDC: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="1000.00"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Amount of USDC to deposit into your liquidity profile
          </p>
        </div>

        {/* Max Lock Days */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Maximum Lock Days: {formData.maxLockDays}
          </label>
          <input
            type="range"
            min="1"
            max="365"
            value={formData.maxLockDays}
            onChange={(e) => setFormData({ ...formData, maxLockDays: parseInt(e.target.value) })}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Maximum duration for options you'll write (1-365 days)
          </p>
        </div>

        {/* Min Unit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Minimum Fill Unit
          </label>
          <input
            type="number"
            step="0.001"
            min="0.001"
            value={formData.minUnit}
            onChange={(e) => setFormData({ ...formData, minUnit: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Minimum fill size for partial fills (in token units)
          </p>
        </div>

        {/* Min Premium */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Minimum Premium (USDC)
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={formData.minPremium}
            onChange={(e) => setFormData({ ...formData, minPremium: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Minimum premium in USDC (e.g., 0.01 USDC)
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
          {loading ? 'Creating Profile...' : 'Create Profile'}
        </button>
      </form>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-800">
        <p className="font-medium mb-1">Note:</p>
        <p>Make sure you have approved USDC spending before creating a profile. You'll need sufficient USDC balance.</p>
      </div>
    </div>
  );
}
