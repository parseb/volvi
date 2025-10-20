import { useVincent } from '@/hooks/useVincent';

export function LoginPage() {
  const { connect } = useVincent();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Volvi Options
          </h1>
          <p className="text-gray-600">
            USDC-only options protocol with automated liquidity
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={connect}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Connect with Vincent
          </button>

          <div className="text-sm text-gray-500 text-center">
            <p>Connect your Agent Wallet to:</p>
            <ul className="mt-2 space-y-1">
              <li>✓ Create liquidity profiles</li>
              <li>✓ Write & take options</li>
              <li>✓ Manage positions</li>
              <li>✓ 100% gasless with USDC only</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Powered by Vincent & Lit Protocol
          </p>
        </div>
      </div>
    </div>
  );
}
