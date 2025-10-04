'use client';

import { useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { ethers } from 'ethers';

interface SettlementOrder {
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  buyAmount: string;
  validTo: number;
  appData: string;
  feeAmount: string;
  kind: string;
  partiallyFillable: boolean;
}

interface SettlementDialogProps {
  tokenId: string;
  option: {
    underlying: string;
    strikePrice: string;
    amount: string;
    optionType: number;
    expiry: number;
    payout: string;
  };
  onClose: () => void;
  onSuccess: (orderUid: string) => void;
  backendUrl: string;
  chainId: number;
}

export default function SettlementDialog({
  tokenId,
  option,
  onClose,
  onSuccess,
  backendUrl,
  chainId
}: SettlementDialogProps) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [step, setStep] = useState<'initiate' | 'approve' | 'submit'>('initiate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minBuyAmount, setMinBuyAmount] = useState('');
  const [settlementOrder, setSettlementOrder] = useState<SettlementOrder | null>(null);
  const [settlementConditionsHash, setSettlementConditionsHash] = useState<string>('');
  const [eip1271Signature, setEip1271Signature] = useState<string>('');

  const handleInitiate = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate minimum buy amount (95% of payout for 5% slippage)
      const payoutBigInt = BigInt(option.payout);
      const minBuy = (payoutBigInt * 95n) / 100n;

      const response = await fetch(`${backendUrl}/api/settlement/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId,
          minBuyAmount: minBuy.toString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate settlement');
      }

      const result = await response.json();

      setSettlementOrder(result.order);
      setSettlementConditionsHash(result.settlementConditionsHash);
      setStep('approve');

      console.log('Settlement initiated:', result);
    } catch (err) {
      console.error('Failed to initiate settlement:', err);
      setError(err instanceof Error ? err.message : 'Failed to initiate settlement');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!walletClient || !settlementConditionsHash) {
      setError('Missing required data');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create signer
      const provider = new ethers.BrowserProvider(walletClient as any);
      const signer = await provider.getSigner();

      // Sign settlement conditions hash (EIP-712)
      const domain = {
        name: 'Options Protocol',
        version: '1',
        chainId,
        verifyingContract: settlementOrder?.sellToken || ''
      };

      const types = {
        SettlementApproval: [
          { name: 'tokenId', type: 'uint256' },
          { name: 'conditionsHash', type: 'bytes32' }
        ]
      };

      const value = {
        tokenId,
        conditionsHash: settlementConditionsHash
      };

      const signature = await signer.signTypedData(domain, types, value);

      // Send approval to backend
      const response = await fetch(`${backendUrl}/api/settlement/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId,
          settlementConditionsHash,
          takerSignature: signature
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve settlement');
      }

      const result = await response.json();

      setEip1271Signature(result.eip1271Signature);
      setStep('submit');

      console.log('Settlement approved:', result);
    } catch (err) {
      console.error('Failed to approve settlement:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve settlement');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!settlementOrder || !eip1271Signature) {
      setError('Missing required data');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${backendUrl}/api/settlement/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId,
          order: settlementOrder,
          eip1271Signature
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit settlement');
      }

      const result = await response.json();

      console.log('Settlement submitted:', result);
      onSuccess(result.orderUid);
    } catch (err) {
      console.error('Failed to submit settlement:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit settlement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Settle Option (Gasless)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Option Details */}
          <div className="bg-gray-800 p-4 rounded">
            <h3 className="font-semibold mb-2">Option Details</h3>
            <div className="text-sm space-y-1 text-gray-300">
              <div>Token ID: {tokenId}</div>
              <div>Type: {option.optionType === 1 ? 'Call' : 'Put'}</div>
              <div>Amount: {ethers.formatUnits(option.amount, 18)}</div>
              <div>Strike: ${ethers.formatUnits(option.strikePrice, 6)}</div>
              <div>Payout: {ethers.formatUnits(option.payout, 18)} tokens</div>
              <div>Expiry: {new Date(option.expiry * 1000).toLocaleString()}</div>
            </div>
          </div>

          {/* Settlement Progress */}
          <div className="space-y-2">
            <div className={`flex items-center space-x-2 ${step === 'initiate' ? 'text-blue-400' : 'text-green-400'}`}>
              <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center">
                {step !== 'initiate' ? '✓' : '1'}
              </div>
              <span>Initiate Settlement</span>
            </div>
            <div className={`flex items-center space-x-2 ${step === 'approve' ? 'text-blue-400' : step === 'submit' ? 'text-green-400' : 'text-gray-500'}`}>
              <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center">
                {step === 'submit' ? '✓' : '2'}
              </div>
              <span>Approve Settlement</span>
            </div>
            <div className={`flex items-center space-x-2 ${step === 'submit' ? 'text-blue-400' : 'text-gray-500'}`}>
              <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center">
                3
              </div>
              <span>Submit to CowSwap</span>
            </div>
          </div>

          {/* Settlement Order Details */}
          {settlementOrder && (
            <div className="bg-gray-800 p-4 rounded">
              <h3 className="font-semibold mb-2">Settlement Order</h3>
              <div className="text-sm space-y-1 text-gray-300">
                <div>Sell: {ethers.formatUnits(settlementOrder.sellAmount, 18)} tokens</div>
                <div>Buy: {ethers.formatUnits(settlementOrder.buyAmount, 6)} USDC (min)</div>
                <div>Valid Until: {new Date(settlementOrder.validTo * 1000).toLocaleString()}</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {step === 'initiate' && (
            <button
              onClick={handleInitiate}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded"
            >
              {loading ? 'Initiating...' : 'Initiate Settlement'}
            </button>
          )}

          {step === 'approve' && (
            <button
              onClick={handleApprove}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded"
            >
              {loading ? 'Signing...' : 'Approve Settlement (Sign Message)'}
            </button>
          )}

          {step === 'submit' && (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded"
            >
              {loading ? 'Submitting...' : 'Submit to CowSwap'}
            </button>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-900 border border-red-700 p-3 rounded text-sm">
              {error}
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-900 border border-blue-700 p-3 rounded text-xs text-gray-300">
            <div className="font-semibold mb-1">💡 Gasless Settlement</div>
            <div>
              CowSwap will execute the swap and pay gas. You only sign messages to approve the settlement terms.
              The contract signs the order on your behalf (EIP-1271).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
