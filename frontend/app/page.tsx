'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Orderbook } from '@/components/Orderbook';
import GaslessTakeSidebar from '@/components/GaslessTakeSidebar';
import { WriterSidebar } from '@/components/WriterSidebar';
import TokenSelector from '@/components/TokenSelector';
import { chainId } from '@/lib/config';
import type { OrderbookOffer } from '@/lib/types';
import type { Token } from '@/lib/cowswap-tokens';

export default function Home() {
  const { isConnected } = useAccount();
  const [selectedOffer, setSelectedOffer] = useState<OrderbookOffer | null>(null);
  const [activeTab, setActiveTab] = useState<'taker' | 'writer'>('taker');
  const [selectedToken, setSelectedToken] = useState('0x4200000000000000000000000000000000000006'); // WETH on Base
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [selectedTokenInfo, setSelectedTokenInfo] = useState<Token | null>(null);

  // Configuration
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
  const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base
  const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS || '0x0000000000000000000000000000000000000000';

  const handleTakeSuccess = (txHash: string, tokenId: string) => {
    console.log('Option taken successfully:', { txHash, tokenId });
    setSelectedOffer(null);
    // Optionally: Show success notification, refresh orderbook
  };

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
                href="/dashboard"
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Dashboard
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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Orderbook</h2>
              <div className="bg-green-900 border border-green-700 px-3 py-1 rounded text-xs">
                ⚡ 100% Gasless - Pay only in USDC
              </div>
            </div>
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => setShowTokenSelector(true)}
                className="px-4 py-2 border rounded bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <span>{selectedTokenInfo?.symbol || 'WETH'}</span>
                <span className="text-xs text-gray-500">▼</span>
              </button>

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
          <GaslessTakeSidebar
            offer={selectedOffer as any}
            onClose={() => setSelectedOffer(null)}
            onSuccess={handleTakeSuccess}
            backendUrl={BACKEND_URL}
            usdcAddress={USDC_ADDRESS}
            vaultAddress={VAULT_ADDRESS}
            chainId={chainId}
          />
        ) : (
          <WriterSidebar />
        )}
      </div>

      {/* Token Selector Modal */}
      {showTokenSelector && (
        <TokenSelector
          chainId={chainId}
          selectedToken={selectedTokenInfo}
          onSelect={(token) => {
            setSelectedToken(token.address);
            setSelectedTokenInfo(token);
          }}
          onClose={() => setShowTokenSelector(false)}
        />
      )}

      {/* Info Footer */}
      <footer className="border-t mt-12 py-6 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600 dark:text-gray-400">
          <p className="mb-2">
            <strong>⚡ 100% Gasless Options Protocol:</strong> Takers pay only in USDC (~$0.02 gas + premium).
            No ETH needed! Settlement via CowSwap is also gasless.
          </p>
          <p className="mb-2">
            Writers create signed offers off-chain (EIP-712). Takers execute using EIP-3009 USDC authorizations.
            Options are ERC-721 NFTs that can be transferred.
          </p>
          <p>
            Settlement uses CowSwap with EIP-1271 contract signatures. The contract signs orders on behalf of options.
            Powered by <a href="https://cow.fi" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">CowSwap</a> token list.
          </p>
        </div>
      </footer>
    </div>
  );
}
