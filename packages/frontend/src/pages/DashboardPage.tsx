import { useState } from 'react';
import { useVincent } from '@/hooks/useVincent';
import { CreateProfileForm } from '@/components/CreateProfileForm';
import { CreateOfferForm } from '@/components/CreateOfferForm';
import { Orderbook } from '@/components/Orderbook';
import { PositionsList } from '@/components/PositionsList';

export function DashboardPage() {
  const { pkpInfo, disconnect } = useVincent();
  const [activeTab, setActiveTab] = useState<'profile' | 'write' | 'orderbook' | 'positions'>('orderbook');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              Volvi Options Protocol
            </h1>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                {pkpInfo?.ethAddress && (
                  <span className="font-mono">
                    {pkpInfo.ethAddress.slice(0, 6)}...{pkpInfo.ethAddress.slice(-4)}
                  </span>
                )}
              </div>
              <button
                onClick={disconnect}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-6">
          <nav className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('orderbook')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'orderbook'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Orderbook
            </button>
            <button
              onClick={() => setActiveTab('positions')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'positions'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              My Positions
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'profile'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Create Profile
            </button>
            <button
              onClick={() => setActiveTab('write')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'write'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Write Options
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'orderbook' && <Orderbook />}
          {activeTab === 'positions' && <PositionsList />}
          {activeTab === 'profile' && <CreateProfileForm />}
          {activeTab === 'write' && <CreateOfferForm />}
        </div>
      </main>
    </div>
  );
}
