'use client';

import { useState, useEffect } from 'react';
import { fetchTokenList, searchTokens, type Token } from '../lib/cowswap-tokens';

interface TokenSelectorProps {
  chainId: number;
  selectedToken: Token | null;
  onSelect: (token: Token) => void;
  onClose: () => void;
}

export default function TokenSelector({
  chainId,
  selectedToken,
  onSelect,
  onClose
}: TokenSelectorProps) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [filteredTokens, setFilteredTokens] = useState<Token[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTokens();
  }, [chainId]);

  useEffect(() => {
    if (searchQuery) {
      handleSearch(searchQuery);
    } else {
      setFilteredTokens(tokens);
    }
  }, [searchQuery, tokens]);

  const loadTokens = async () => {
    try {
      setLoading(true);
      const tokenList = await fetchTokenList(chainId);
      setTokens(tokenList);
      setFilteredTokens(tokenList);
    } catch (error) {
      console.error('Failed to load tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query) {
      setFilteredTokens(tokens);
      return;
    }

    const results = await searchTokens(chainId, query);
    setFilteredTokens(results);
  };

  const handleSelect = (token: Token) => {
    onSelect(token);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full max-h-[600px] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Select Token</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or symbol..."
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 mb-4"
        />

        {/* Token List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading tokens...</div>
          ) : filteredTokens.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No tokens found</div>
          ) : (
            filteredTokens.map((token) => (
              <button
                key={token.address}
                onClick={() => handleSelect(token)}
                className={`w-full flex items-center space-x-3 p-3 rounded hover:bg-gray-800 transition ${
                  selectedToken?.address === token.address ? 'bg-gray-800 border border-blue-500' : ''
                }`}
              >
                {token.logoURI ? (
                  <img
                    src={token.logoURI}
                    alt={token.symbol}
                    className="w-8 h-8 rounded-full"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs">
                    {token.symbol.slice(0, 2)}
                  </div>
                )}
                <div className="flex-1 text-left">
                  <div className="font-semibold">{token.symbol}</div>
                  <div className="text-sm text-gray-400">{token.name}</div>
                </div>
                {selectedToken?.address === token.address && (
                  <div className="text-blue-500">✓</div>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-400 text-center">
          Powered by <a href="https://cow.fi" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">CowSwap</a> token list
        </div>
      </div>
    </div>
  );
}
