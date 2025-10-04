'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Orderbook } from '@/components/Orderbook';
import { TakerSidebar } from '@/components/TakerSidebar';
import { WriterSidebar } from '@/components/WriterSidebar';
import type { OrderbookOffer } from '@/lib/types';

export default function Home() {
  const { isConnected } = useAccount();
  const [selectedOffer, setSelectedOffer] = useState<OrderbookOffer | null>(null);
  const [activeTab, setActiveTab] = useState<'taker' | 'writer'>('taker');
  const [selectedToken, setSelectedToken] = useState('0x4200000000000000000000000000000000000006'); // WETH on Base

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Options Protocol</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Decentralized options trading on Base
              </p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/portfolio"
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Portfolio
              </a>
              <w3m-button />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex">
        {/* Left: Orderbook */}
        <div className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4">Orderbook</h2>
            <div className="flex gap-4 mb-4">
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                className="px-4 py-2 border rounded bg-white dark:bg-gray-800"
              >
                <option value="0x4200000000000000000000000000000000000006">WETH</option>
                <option value="0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599">WBTC</option>
                <option value="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913">USDC</option>
              </select>

              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('taker')}
                  className={`px-4 py-2 rounded ${
                    activeTab === 'taker'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Take Options
                </button>
                <button
                  onClick={() => setActiveTab('writer')}
                  className={`px-4 py-2 rounded ${
                    activeTab === 'writer'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Write Options
                </button>
              </div>
            </div>
          </div>

          <Orderbook token={selectedToken} onSelectOffer={setSelectedOffer} />
        </div>

        {/* Right: Sidebar */}
        {activeTab === 'taker' ? (
          <TakerSidebar offer={selectedOffer} onClose={() => setSelectedOffer(null)} />
        ) : (
          <WriterSidebar />
        )}
      </div>

      {/* Info Footer */}
      <footer className="border-t mt-12 py-6 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600 dark:text-gray-400">
          <p className="mb-2">
            <strong>How it works:</strong> Writers create signed offers off-chain. Takers execute on-chain,
            locking collateral.
          </p>
          <p>
            Options are ERC-721 NFTs and can be transferred. Settlement happens automatically at expiry or
            can be triggered by anyone.
          </p>
        </div>
      </footer>
    </div>
  );
}
