import { useVincent } from '@/hooks/useVincent';

export function DashboardPage() {
  const { pkpInfo, disconnect } = useVincent();

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create Profile Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Create Profile
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Create a USDC liquidity profile for writing options
            </p>
            <button className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded transition-colors">
              Get Started
            </button>
          </div>

          {/* Write Options Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Write Options
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Create signed offers to write calls and puts
            </p>
            <button className="w-full bg-gray-300 text-gray-500 font-medium py-2 px-4 rounded cursor-not-allowed">
              Coming Soon
            </button>
          </div>

          {/* Take Options Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Take Options
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Browse orderbook and take options gaslessly
            </p>
            <button className="w-full bg-gray-300 text-gray-500 font-medium py-2 px-4 rounded cursor-not-allowed">
              Coming Soon
            </button>
          </div>
        </div>

        {/* Positions Section */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Your Positions
          </h2>
          <div className="text-center py-12 text-gray-500">
            No positions yet. Create a profile or take an option to get started!
          </div>
        </div>
      </main>
    </div>
  );
}
