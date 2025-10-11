'use client';

import { useState, useEffect } from 'react';
import { useAccount, useSignTypedData, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, keccak256, encodeAbiParameters, erc20Abi, maxUint256 } from 'viem';
import { protocolAddress, chainId } from '@/lib/config';
import { submitOffer } from '@/lib/api';
import TokenSelector from './TokenSelector';
import type { OptionOffer } from '@/lib/types';
import type { Token } from '@/lib/cowswap-tokens';

export function WriterSidebar() {
  const { address, isConnected, chain } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const { writeContract, data: approvalTxHash, error: writeError, isError: isWriteError } = useWriteContract();

  // Log current chain
  useEffect(() => {
    console.log('Current chain:', chain);
    if (chain && chain.id !== 123999) {
      console.warn(`⚠️ Wrong network! Connected to chain ${chain.id} (${chain.name}), but should be 123999 (Base Fork)`);
    }
  }, [chain]);

  const [formData, setFormData] = useState({
    underlying: '',
    collateralAmount: '',
    isCall: true,
    premiumPerDay: '',
    minDuration: 7,
    maxDuration: 365,
    minFillAmount: '',
    deadline: 30, // Days from now
  });

  const [status, setStatus] = useState<'idle' | 'approving' | 'signing' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [insufficientBalance, setInsufficientBalance] = useState(false);

  // Check token balance
  const { data: tokenBalance } = useReadContract({
    address: formData.underlying as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: {
      enabled: !!address && !!formData.underlying && formData.underlying !== '',
    },
  });

  // Check allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: formData.underlying as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address as `0x${string}`, protocolAddress],
    query: {
      enabled: !!address && !!formData.underlying && formData.underlying !== '',
    },
  });

  // Wait for approval transaction
  const { isSuccess: approvalSuccess, isError: isApprovalError } = useWaitForTransactionReceipt({
    hash: approvalTxHash,
  });

  // Log approval transaction status
  useEffect(() => {
    if (approvalTxHash) {
      console.log('Approval transaction submitted:', approvalTxHash);
    }
  }, [approvalTxHash]);

  useEffect(() => {
    if (approvalSuccess) {
      console.log('Approval transaction confirmed!');
    }
  }, [approvalSuccess]);

  // Check if approval is needed and balance is sufficient
  useEffect(() => {
    if (!formData.underlying || !formData.collateralAmount || allowance === undefined || tokenBalance === undefined) {
      setNeedsApproval(false);
      setInsufficientBalance(false);
      return;
    }

    try {
      const decimals = selectedToken?.decimals || 18;
      const requiredAmount = parseUnits(formData.collateralAmount, decimals);
      const needsApprovalCheck = allowance < requiredAmount;
      const insufficientBalanceCheck = tokenBalance < requiredAmount;

      console.log('Approval & Balance check:', {
        balance: tokenBalance.toString(),
        allowance: allowance.toString(),
        requiredAmount: requiredAmount.toString(),
        needsApprovalCheck,
        insufficientBalanceCheck,
        decimals
      });

      setNeedsApproval(needsApprovalCheck);
      setInsufficientBalance(insufficientBalanceCheck);
    } catch (error) {
      console.error('Error checking approval/balance:', error);
      setNeedsApproval(false);
      setInsufficientBalance(false);
    }
  }, [allowance, tokenBalance, formData.underlying, formData.collateralAmount, selectedToken]);

  // Refetch allowance after successful approval
  useEffect(() => {
    if (approvalSuccess) {
      refetchAllowance();
      setStatus('idle');
    }
  }, [approvalSuccess, refetchAllowance]);

  // Handle write errors (user rejection, etc.)
  useEffect(() => {
    if (isWriteError && writeError) {
      console.error('Write contract error:', writeError);
      setStatus('error');
      setErrorMsg(writeError.message || 'Transaction rejected');
      // Reset after 3 seconds
      setTimeout(() => {
        setStatus('idle');
        setErrorMsg('');
      }, 3000);
    }
  }, [isWriteError, writeError]);

  // Handle approval transaction errors
  useEffect(() => {
    if (isApprovalError) {
      console.error('Approval transaction failed');
      setStatus('error');
      setErrorMsg('Approval transaction failed');
      setTimeout(() => {
        setStatus('idle');
        setErrorMsg('');
      }, 3000);
    }
  }, [isApprovalError]);

  const handleApprove = async () => {
    if (!formData.underlying) return;

    try {
      setStatus('approving');
      setErrorMsg('');

      console.log('Initiating approval transaction...', {
        token: formData.underlying,
        spender: protocolAddress,
        amount: 'max',
        chain: chain?.id,
        chainName: chain?.name,
      });

      writeContract({
        address: formData.underlying as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [protocolAddress, maxUint256],
      });
    } catch (error: any) {
      console.error('Failed to approve:', error);
      setStatus('error');
      setErrorMsg(error.message || 'Failed to approve token');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      setErrorMsg('Please connect your wallet');
      return;
    }

    if (!formData.underlying || formData.underlying === '') {
      setErrorMsg('Please select a token');
      return;
    }

    try {
      setStatus('signing');
      setErrorMsg('');

      // Build the offer
      const deadlineTimestamp = BigInt(Math.floor(Date.now() / 1000) + formData.deadline * 86400);
      const configHash = keccak256(encodeAbiParameters(
        [{ type: 'address' }],
        [formData.underlying as `0x${string}`]
      ));

      const decimals = selectedToken?.decimals || 18;
      const offer: OptionOffer = {
        writer: address,
        underlying: formData.underlying as `0x${string}`,
        collateralAmount: parseUnits(formData.collateralAmount, decimals),
        stablecoin: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`, // USDC on Base
        isCall: formData.isCall,
        premiumPerDay: parseUnits(formData.premiumPerDay, 6), // USDC has 6 decimals
        minDuration: formData.minDuration,
        maxDuration: formData.maxDuration,
        minFillAmount: parseUnits(formData.minFillAmount || formData.collateralAmount, decimals),
        deadline: deadlineTimestamp,
        configHash,
      };

      // Sign with EIP-712
      const domain = {
        name: 'OptionsProtocol',
        version: '1',
        chainId: BigInt(chainId),
        verifyingContract: protocolAddress,
      };

      const types = {
        OptionOffer: [
          { name: 'writer', type: 'address' },
          { name: 'underlying', type: 'address' },
          { name: 'collateralAmount', type: 'uint256' },
          { name: 'stablecoin', type: 'address' },
          { name: 'isCall', type: 'bool' },
          { name: 'premiumPerDay', type: 'uint256' },
          { name: 'minDuration', type: 'uint16' },
          { name: 'maxDuration', type: 'uint16' },
          { name: 'minFillAmount', type: 'uint256' },
          { name: 'deadline', type: 'uint64' },
          { name: 'configHash', type: 'bytes32' },
        ],
      };

      const signature = await signTypedDataAsync({
        domain,
        types,
        primaryType: 'OptionOffer',
        message: offer as any,
      });

      // Submit to backend
      setStatus('submitting');
      await submitOffer(offer, signature);

      setStatus('success');
      // Reset form
      setFormData({
        underlying: '',
        collateralAmount: '',
        isCall: true,
        premiumPerDay: '',
        minDuration: 7,
        maxDuration: 365,
        minFillAmount: '',
        deadline: 30,
      });

      setTimeout(() => setStatus('idle'), 3000);
    } catch (error: any) {
      console.error('Failed to create offer:', error);
      setStatus('error');
      setErrorMsg(error.message || 'Failed to create offer');
    }
  };

  return (
    <div className="w-96 border-l p-6 bg-gray-50 dark:bg-gray-900">
      <h2 className="text-xl font-bold mb-4">Write Option</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Option Type */}
        <div>
          <label className="block text-sm font-medium mb-2">Option Type</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormData((f) => ({ ...f, isCall: true }))}
              className={`flex-1 py-2 rounded ${
                formData.isCall
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              CALL
            </button>
            <button
              type="button"
              onClick={() => setFormData((f) => ({ ...f, isCall: false }))}
              className={`flex-1 py-2 rounded ${
                !formData.isCall
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              PUT
            </button>
          </div>
        </div>

        {/* Asset */}
        <div>
          <label className="block text-sm font-medium mb-2">Asset</label>
          <button
            type="button"
            onClick={() => setShowTokenSelector(true)}
            className="w-full px-4 py-2 border rounded bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              {selectedToken ? (
                <>
                  {selectedToken.logoURI && (
                    <img src={selectedToken.logoURI} alt={selectedToken.symbol} className="w-5 h-5 rounded-full" />
                  )}
                  <span>{selectedToken.symbol}</span>
                  <span className="text-xs text-gray-500">{selectedToken.name}</span>
                </>
              ) : (
                <span className="text-gray-500">Select asset...</span>
              )}
            </span>
            <span className="text-xs text-gray-500">▼</span>
          </button>
        </div>

        {/* Collateral Amount */}
        <div>
          <label className="block text-sm font-medium mb-2">Collateral Amount</label>
          <input
            type="number"
            value={formData.collateralAmount}
            onChange={(e) => setFormData((f) => ({ ...f, collateralAmount: e.target.value }))}
            placeholder="0.0"
            className="w-full px-4 py-2 border rounded bg-white dark:bg-gray-800"
            step="0.01"
            required
          />
        </div>

        {/* Premium Per Day */}
        <div>
          <label className="block text-sm font-medium mb-2">Premium Per Day (USDC)</label>
          <input
            type="number"
            value={formData.premiumPerDay}
            onChange={(e) => setFormData((f) => ({ ...f, premiumPerDay: e.target.value }))}
            placeholder="0.0"
            className="w-full px-4 py-2 border rounded bg-white dark:bg-gray-800"
            step="0.01"
            required
          />
        </div>

        {/* Duration Range */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium mb-2">Min Duration (days)</label>
            <input
              type="number"
              value={formData.minDuration}
              onChange={(e) => setFormData((f) => ({ ...f, minDuration: parseInt(e.target.value) }))}
              className="w-full px-4 py-2 border rounded bg-white dark:bg-gray-800"
              min="1"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Max Duration (days)</label>
            <input
              type="number"
              value={formData.maxDuration}
              onChange={(e) => setFormData((f) => ({ ...f, maxDuration: parseInt(e.target.value) }))}
              className="w-full px-4 py-2 border rounded bg-white dark:bg-gray-800"
              min={formData.minDuration}
              required
            />
          </div>
        </div>

        {/* Min Fill Amount (Optional) */}
        <div>
          <label className="block text-sm font-medium mb-2">Min Fill Amount (Optional)</label>
          <input
            type="number"
            value={formData.minFillAmount}
            onChange={(e) => setFormData((f) => ({ ...f, minFillAmount: e.target.value }))}
            placeholder="Same as collateral"
            className="w-full px-4 py-2 border rounded bg-white dark:bg-gray-800"
            step="0.01"
          />
        </div>

        {/* Deadline */}
        <div>
          <label className="block text-sm font-medium mb-2">Offer Valid For (days)</label>
          <input
            type="number"
            value={formData.deadline}
            onChange={(e) => setFormData((f) => ({ ...f, deadline: parseInt(e.target.value) }))}
            className="w-full px-4 py-2 border rounded bg-white dark:bg-gray-800"
            min="1"
            required
          />
        </div>

        {/* Approval/Submit Buttons */}
        {!isConnected ? (
          <button type="button" className="w-full py-3 bg-gray-400 text-white rounded cursor-not-allowed">
            Connect Wallet
          </button>
        ) : !formData.underlying || formData.underlying === '' ? (
          <button type="button" className="w-full py-3 bg-gray-400 text-white rounded cursor-not-allowed">
            Select a Token
          </button>
        ) : insufficientBalance ? (
          <button type="button" className="w-full py-3 bg-gray-400 text-white rounded cursor-not-allowed">
            Insufficient {selectedToken?.symbol || 'Token'} Balance
          </button>
        ) : needsApproval ? (
          <button
            type="button"
            onClick={handleApprove}
            disabled={status === 'approving'}
            className={`w-full py-3 rounded font-semibold ${
              status === 'approving'
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-yellow-600 text-white hover:bg-yellow-700'
            }`}
          >
            {status === 'approving' ? 'Approving...' : `Approve ${selectedToken?.symbol || 'Token'}`}
          </button>
        ) : (
          <button
            type="submit"
            disabled={status === 'signing' || status === 'submitting' || status === 'approving'}
            className={`w-full py-3 rounded font-semibold ${
              status === 'signing' || status === 'submitting' || status === 'approving'
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : status === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {status === 'signing'
              ? 'Sign in Wallet...'
              : status === 'submitting'
              ? 'Submitting...'
              : status === 'success'
              ? 'Success!'
              : 'Create Offer'}
          </button>
        )}

        {/* Error Message */}
        {status === 'error' && errorMsg && (
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded text-red-700 dark:text-red-300 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Approval Info */}
        {needsApproval && (
          <div className="text-xs text-gray-600 dark:text-gray-400 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
            <p className="font-semibold mb-1">⚠️ Approval Required</p>
            <p>You need to approve the protocol to use your {selectedToken?.symbol || 'tokens'} as collateral. This is a one-time transaction.</p>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-gray-500 mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
          <p className="font-semibold mb-1">How it works:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Approve once to enable writing offers with this token</li>
            <li>Sign offers off-chain (gasless)</li>
            <li>Collateral is locked only when someone takes your offer</li>
            <li>Takers pay 100% gasless via USDC authorization</li>
          </ul>
        </div>
      </form>

      {/* Token Selector Modal */}
      {showTokenSelector && (
        <TokenSelector
          chainId={chainId}
          selectedToken={selectedToken}
          onSelect={(token) => {
            setSelectedToken(token);
            setFormData((f) => ({ ...f, underlying: token.address }));
            setShowTokenSelector(false);
          }}
          onClose={() => setShowTokenSelector(false)}
        />
      )}
    </div>
  );
}
