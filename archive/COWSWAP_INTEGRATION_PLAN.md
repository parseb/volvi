# CowSwap Integration Plan - Gasless Options Protocol

## 🎯 Overview

Transform the Options Protocol to use **CowSwap** for gasless order creation and settlement, with EIP-1271 contract signatures for option-driven swaps.

### Key Benefits
- ✅ **Gasless order creation** - Writers create offers without gas
- ✅ **Gasless settlement** - Options settle via CowSwap without user gas
- ✅ **MEV protection** - CowSwap's batch auction prevents frontrunning
- ✅ **Better execution** - CoW Solver competition for best prices
- ✅ **Pre/Post hooks** - Conditional settlement logic
- ✅ **EIP-1271** - Smart contract signatures for options

---

## 🏗️ Architecture Overview

### Current Architecture
```
Writer → Sign Offer (EIP-712) → Taker Executes → Collateral Locked → Settlement (Direct Swap)
```

### New CowSwap Architecture
```
Writer → Sign Offer (EIP-712) → Taker Executes → Option NFT Minted
                                                          ↓
Option Contract (EIP-1271) → CowSwap Order → Solver Matches → Settlement
         ↓                                                           ↓
    Pre-Hook                                                    Post-Hook
    (Verify conditions)                                      (Distribute funds)
```

---

## 📊 Integration Components

### 1. Smart Contract Changes

#### A. EIP-1271 Implementation
The `OptionsProtocol` contract needs to implement EIP-1271 to sign CowSwap orders:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/interfaces/IERC1271.sol";

contract OptionsProtocol is ERC721, IERC1271 {
    // EIP-1271 magic value
    bytes4 constant internal MAGICVALUE = 0x1626ba7e;

    // Settlement state for each option
    enum SettlementState {
        Active,           // Option is active
        InSettlement,     // Settlement initiated
        Settled           // Fully settled
    }

    struct SettlementTerms {
        bytes32 orderHash;        // CowSwap order hash
        uint256 minBuyAmount;     // Minimum acceptable output
        uint64 validTo;           // Order deadline
        bytes32 appData;          // CowSwap app data (includes hooks)
        bool takerApproved;       // Taker signature flag
    }

    mapping(uint256 => SettlementState) public settlementStates;
    mapping(uint256 => SettlementTerms) public settlementTerms;
    mapping(bytes32 => uint256) public cowOrderToOption; // CowSwap order → option ID

    /**
     * @notice EIP-1271 signature validation for CowSwap orders
     * @param orderDigest The CowSwap order hash
     * @param signature Contains: tokenId (uint256) + taker signature (bytes)
     */
    function isValidSignature(
        bytes32 orderDigest,
        bytes memory signature
    ) external view override returns (bytes4) {
        // Decode signature: first 32 bytes = tokenId
        uint256 tokenId = abi.decode(signature[:32], (uint256));
        bytes memory takerSig = signature[32:];

        ActiveOption memory option = options[tokenId];
        SettlementTerms memory terms = settlementTerms[tokenId];

        // Verify conditions:
        // 1. Order hash matches settlement terms
        require(terms.orderHash == orderDigest, "Invalid order hash");

        // 2. Option is expired
        require(block.timestamp >= option.expiryTime, "Not expired");

        // 3. Option not already settled
        require(!option.settled, "Already settled");

        // 4. Settlement state is InSettlement
        require(settlementStates[tokenId] == SettlementState.InSettlement, "Not in settlement");

        // 5. Taker has approved settlement terms
        require(_verifyTakerSignature(tokenId, terms, takerSig), "Taker not approved");

        return MAGICVALUE;
    }

    /**
     * @notice Initiate settlement by creating CowSwap order terms
     * @param tokenId The option NFT ID
     * @param settlementOrder The CowSwap order parameters
     */
    function initiateSettlement(
        uint256 tokenId,
        SettlementTerms calldata settlementOrder
    ) external {
        ActiveOption storage option = options[tokenId];

        require(block.timestamp >= option.expiryTime, "Not expired");
        require(!option.settled, "Already settled");
        require(settlementStates[tokenId] == SettlementState.Active, "Invalid state");

        // Store settlement terms
        settlementTerms[tokenId] = settlementOrder;
        settlementStates[tokenId] = SettlementState.InSettlement;
        cowOrderToOption[settlementOrder.orderHash] = tokenId;

        emit SettlementInitiated(tokenId, settlementOrder.orderHash);
    }

    /**
     * @notice Taker approves settlement terms by signing
     * @param tokenId The option NFT ID
     * @param signature Taker's signature over settlement terms
     */
    function approveSettlement(
        uint256 tokenId,
        bytes calldata signature
    ) external {
        require(ownerOf(tokenId) == msg.sender, "Not option owner");

        SettlementTerms storage terms = settlementTerms[tokenId];
        bytes32 termsHash = _hashSettlementTerms(tokenId, terms);

        address signer = ECDSA.recover(termsHash, signature);
        require(signer == msg.sender, "Invalid signature");

        terms.takerApproved = true;

        emit SettlementApproved(tokenId, msg.sender);
    }
}
```

#### B. CowSwap Hooks Integration

**Pre-Hook**: Verify settlement conditions before swap
```solidity
/**
 * @notice Pre-hook called by CowSwap before settlement
 * @dev Validates option is ready for settlement
 */
function preSettlementHook(uint256 tokenId) external view {
    ActiveOption memory option = options[tokenId];

    require(block.timestamp >= option.expiryTime, "Not expired");
    require(!option.settled, "Already settled");
    require(settlementStates[tokenId] == SettlementState.InSettlement, "Not ready");

    // Additional conditions can be checked here
    // - Oracle price validation
    // - Minimum profit threshold
    // - etc.
}
```

**Post-Hook**: Distribute settlement proceeds
```solidity
/**
 * @notice Post-hook called by CowSwap after settlement
 * @dev Distributes proceeds and marks option as settled
 */
function postSettlementHook(uint256 tokenId, uint256 proceedsReceived) external {
    require(msg.sender == address(cowSettlement), "Only CowSwap");

    ActiveOption storage option = options[tokenId];
    SettlementTerms memory terms = settlementTerms[tokenId];

    require(proceedsReceived >= terms.minBuyAmount, "Slippage too high");

    // Calculate distribution
    uint256 protocolFee = (proceedsReceived * 10) / 10000; // 0.1%
    uint256 profit = proceedsReceived - protocolFee;

    // Transfer proceeds to option holder
    IERC20(stablecoin).transfer(ownerOf(tokenId), profit);
    IERC20(stablecoin).transfer(feeCollector, protocolFee);

    // Mark as settled
    option.settled = true;
    settlementStates[tokenId] = SettlementState.Settled;

    emit OptionSettled(tokenId, profit, msg.sender);
}
```

---

### 2. Backend API Changes

#### A. CowSwap SDK Integration

Install dependencies:
```bash
pnpm add @cowprotocol/cow-sdk
```

#### B. Order Creation Service

```typescript
// backend/src/cowswap.ts
import { OrderBookApi, OrderSigningUtils, SupportedChainId } from '@cowprotocol/cow-sdk';

export class CowSwapService {
  private orderBookApi: OrderBookApi;
  private chainId: SupportedChainId;

  constructor() {
    this.chainId = SupportedChainId.BASE; // Base mainnet
    this.orderBookApi = new OrderBookApi({ chainId: this.chainId });
  }

  /**
   * Create a CowSwap order for option settlement
   */
  async createSettlementOrder(
    tokenId: number,
    option: ActiveOption,
    minBuyAmount: bigint
  ): Promise<SettlementOrder> {
    const validTo = Math.floor(Date.now() / 1000) + 3600; // 1 hour validity

    // Build CowSwap order
    const order = {
      sellToken: option.underlying,           // Sell the collateral
      buyToken: option.stablecoin,           // Buy stablecoin
      sellAmount: option.collateralLocked.toString(),
      buyAmount: minBuyAmount.toString(),
      validTo,
      appData: await this.buildAppData(tokenId), // Includes hooks
      feeAmount: '0',                        // No gas fees!
      kind: 'sell',
      partiallyFillable: false,
      sellTokenBalance: 'erc20',            // From contract balance
      buyTokenBalance: 'erc20'              // To contract
    };

    // Create order hash
    const orderHash = OrderSigningUtils.hashOrder(
      this.chainId,
      order
    );

    return {
      orderHash,
      order,
      validTo
    };
  }

  /**
   * Build CowSwap appData with hooks
   */
  async buildAppData(tokenId: number): Promise<string> {
    const appData = {
      version: '1.0.0',
      appCode: 'OptionsProtocol',
      metadata: {
        hooks: {
          pre: [{
            target: process.env.PROTOCOL_ADDRESS,
            callData: encodePreHook(tokenId),
            gasLimit: '100000'
          }],
          post: [{
            target: process.env.PROTOCOL_ADDRESS,
            callData: encodePostHook(tokenId),
            gasLimit: '200000'
          }]
        }
      }
    };

    // Hash and upload to IPFS
    const appDataHash = await this.uploadToIPFS(appData);
    return appDataHash;
  }

  /**
   * Submit order to CowSwap
   */
  async submitOrder(
    order: any,
    signature: string // EIP-1271 signature from contract
  ): Promise<string> {
    const result = await this.orderBookApi.sendOrder({
      ...order,
      signature,
      signingScheme: 'eip1271',
      from: process.env.PROTOCOL_ADDRESS // Contract address
    });

    return result;
  }

  /**
   * Monitor order status
   */
  async getOrderStatus(orderUid: string): Promise<OrderStatus> {
    return await this.orderBookApi.getOrder(orderUid);
  }
}

function encodePreHook(tokenId: number): string {
  const iface = new ethers.Interface(['function preSettlementHook(uint256)']);
  return iface.encodeFunctionData('preSettlementHook', [tokenId]);
}

function encodePostHook(tokenId: number): string {
  const iface = new ethers.Interface(['function postSettlementHook(uint256,uint256)']);
  // The proceedsReceived will be filled by CowSwap
  return iface.encodeFunctionData('postSettlementHook', [tokenId, 0]);
}
```

#### C. New API Endpoints

```typescript
// POST /api/settlements/initiate
router.post('/settlements/initiate', async (req, res) => {
  const { tokenId, minBuyAmount } = req.body;

  // Get option details
  const option = await contract.options(tokenId);

  // Create CowSwap order
  const cowSwap = new CowSwapService();
  const settlementOrder = await cowSwap.createSettlementOrder(
    tokenId,
    option,
    BigInt(minBuyAmount)
  );

  // Store in database
  await storage.storeSettlement(tokenId, settlementOrder);

  res.json({ success: true, orderHash: settlementOrder.orderHash });
});

// POST /api/settlements/approve
router.post('/settlements/approve', async (req, res) => {
  const { tokenId, signature } = req.body;

  // Call contract to approve settlement
  const tx = await contract.approveSettlement(tokenId, signature);
  await tx.wait();

  // Submit to CowSwap
  const settlement = await storage.getSettlement(tokenId);
  const cowSwap = new CowSwapService();

  // Submit with EIP-1271 signature (contract signature)
  const eip1271Signature = buildEIP1271Signature(tokenId, signature);
  const orderUid = await cowSwap.submitOrder(
    settlement.order,
    eip1271Signature
  );

  res.json({ success: true, orderUid });
});

// GET /api/settlements/:tokenId/status
router.get('/settlements/:tokenId/status', async (req, res) => {
  const { tokenId } = req.params;

  const settlement = await storage.getSettlement(tokenId);
  const cowSwap = new CowSwapService();
  const status = await cowSwap.getOrderStatus(settlement.orderUid);

  res.json(status);
});
```

---

### 3. Frontend Changes

#### A. CowSwap Token List Integration

```typescript
// frontend/lib/tokens.ts
import { useMemo } from 'react';

const COWSWAP_TOKEN_LISTS = {
  base: 'https://raw.githubusercontent.com/cowprotocol/token-lists/main/src/public/CowSwap.json'
};

export function useCowTokenList(chainId: number) {
  const [tokens, setTokens] = useState([]);

  useEffect(() => {
    fetch(COWSWAP_TOKEN_LISTS.base)
      .then(res => res.json())
      .then(data => {
        const chainTokens = data.tokens.filter(t => t.chainId === chainId);
        setTokens(chainTokens);
      });
  }, [chainId]);

  return tokens;
}
```

#### B. Settlement UI Component

```typescript
// frontend/components/SettlementDialog.tsx
'use client';

import { useState } from 'react';
import { useAccount, useSignTypedData } from 'wagmi';
import { CowSwapService } from '@/lib/cowswap';

export function SettlementDialog({ option }: { option: ActiveOption }) {
  const { address } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const [minOutput, setMinOutput] = useState('');
  const [status, setStatus] = useState<'idle' | 'creating' | 'approving' | 'submitted'>('idle');

  const initiateSettlement = async () => {
    setStatus('creating');

    // Create settlement order
    const response = await fetch('/api/settlements/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenId: option.tokenId,
        minBuyAmount: parseUnits(minOutput, 6)
      })
    });

    const { orderHash } = await response.json();

    // Sign settlement terms
    setStatus('approving');
    const signature = await signTypedDataAsync({
      domain: {
        name: 'OptionsProtocol',
        version: '1',
        chainId: 8453,
        verifyingContract: protocolAddress
      },
      types: {
        SettlementTerms: [
          { name: 'tokenId', type: 'uint256' },
          { name: 'orderHash', type: 'bytes32' },
          { name: 'minBuyAmount', type: 'uint256' },
          { name: 'validTo', type: 'uint64' }
        ]
      },
      primaryType: 'SettlementTerms',
      message: {
        tokenId: option.tokenId,
        orderHash,
        minBuyAmount: parseUnits(minOutput, 6),
        validTo: Math.floor(Date.now() / 1000) + 3600
      }
    });

    // Submit to backend (will submit to CowSwap)
    await fetch('/api/settlements/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenId: option.tokenId,
        signature
      })
    });

    setStatus('submitted');
  };

  return (
    <div className="p-6 border rounded">
      <h3 className="text-lg font-bold mb-4">Settle via CowSwap</h3>

      <div className="space-y-4">
        <div>
          <label>Minimum Output (USDC)</label>
          <input
            type="number"
            value={minOutput}
            onChange={(e) => setMinOutput(e.target.value)}
            placeholder="0.0"
            className="w-full px-4 py-2 border rounded"
          />
          <p className="text-xs text-gray-500 mt-1">
            🎉 Gasless settlement via CowSwap!
          </p>
        </div>

        <button
          onClick={initiateSettlement}
          disabled={status !== 'idle'}
          className="w-full py-3 bg-blue-600 text-white rounded"
        >
          {status === 'idle' && 'Settle (No Gas Required!)'}
          {status === 'creating' && 'Creating order...'}
          {status === 'approving' && 'Sign to approve...'}
          {status === 'submitted' && 'Submitted to CowSwap ✓'}
        </button>

        {status === 'submitted' && (
          <div className="bg-green-50 p-3 rounded text-sm">
            Order submitted! CowSwap solvers will compete to give you the best price.
            Settlement will execute automatically when matched.
          </div>
        )}
      </div>
    </div>
  );
}
```

#### C. Token Selector with CowSwap List

```typescript
// frontend/components/TokenSelector.tsx
'use client';

import { useCowTokenList } from '@/lib/tokens';

export function TokenSelector({ onSelect }: { onSelect: (token: any) => void }) {
  const tokens = useCowTokenList(8453); // Base
  const [search, setSearch] = useState('');

  const filteredTokens = tokens.filter(t =>
    t.symbol.toLowerCase().includes(search.toLowerCase()) ||
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="border rounded p-4">
      <input
        type="text"
        placeholder="Search tokens..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2 border rounded mb-4"
      />

      <div className="max-h-96 overflow-y-auto">
        {filteredTokens.map((token) => (
          <button
            key={token.address}
            onClick={() => onSelect(token)}
            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded"
          >
            <img src={token.logoURI} alt={token.symbol} className="w-8 h-8 rounded-full" />
            <div className="text-left">
              <div className="font-semibold">{token.symbol}</div>
              <div className="text-sm text-gray-500">{token.name}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## 🔄 User Flow with CowSwap

### 1. Writing Options (Unchanged)
```
Writer → Sign Offer (EIP-712) → Backend stores → Appears in orderbook
```
**Still gasless!**

### 2. Taking Options (Still requires gas)
```
Taker → Selects offer → Executes takeOption() → Option NFT minted
```
**One gas transaction to mint NFT and lock collateral**

### 3. Settlement (NEW - Gasless!)
```
Option Holder → Initiates settlement:
  1. Backend creates CowSwap order
  2. User signs settlement terms (EIP-712, gasless)
  3. Backend calls approveSettlement() on contract
  4. Backend submits to CowSwap with EIP-1271 signature

CowSwap Solver → Matches order:
  1. Calls preSettlementHook() - validates conditions
  2. Executes swap (sells collateral, buys stablecoin)
  3. Calls postSettlementHook() - distributes proceeds

Result → Profit in taker's wallet (gasless for user!)
```

---

## 🎯 Key Advantages

### 1. Gasless Experience
- **Writer**: Signs offer off-chain ✅
- **Taker**: Only pays gas once to mint NFT ✅
- **Settlement**: Completely gasless via CowSwap ✅

### 2. MEV Protection
- Batch auctions prevent frontrunning
- Solvers compete for best execution
- Users get better prices

### 3. Flexible Settlement
- Taker approves settlement terms
- Can wait for better prices
- Can renegotiate terms

### 4. Better UX
- CowSwap token list integration
- Familiar interface
- Trusted infrastructure

---

## 📋 Implementation Checklist

### Smart Contracts
- [ ] Add EIP-1271 interface to OptionsProtocol
- [ ] Implement `isValidSignature()` method
- [ ] Add settlement state machine
- [ ] Create `initiateSettlement()` function
- [ ] Create `approveSettlement()` function
- [ ] Implement pre-settlement hook
- [ ] Implement post-settlement hook
- [ ] Add CowSwap settlement contract address
- [ ] Update tests for new flow

### Backend
- [ ] Install `@cowprotocol/cow-sdk`
- [ ] Create CowSwapService class
- [ ] Implement order creation
- [ ] Implement appData building with hooks
- [ ] Add settlement endpoints
- [ ] Add order status monitoring
- [ ] Update storage for settlements
- [ ] Add event listeners for settlement events

### Frontend
- [ ] Install `@cowprotocol/cow-sdk`
- [ ] Create SettlementDialog component
- [ ] Integrate CowSwap token list
- [ ] Create TokenSelector component
- [ ] Add settlement status tracking
- [ ] Update PositionCard for settlement
- [ ] Add gasless badges/messaging
- [ ] Add CowSwap branding/attribution

### Testing
- [ ] Test EIP-1271 signature validation
- [ ] Test settlement initiation
- [ ] Test taker approval flow
- [ ] Test CowSwap order submission
- [ ] Test hook execution
- [ ] Test profit distribution
- [ ] End-to-end settlement test

### Documentation
- [ ] Update README with CowSwap integration
- [ ] Document settlement flow
- [ ] Add CowSwap SDK usage
- [ ] Update deployment guide
- [ ] Add troubleshooting section

---

## 🔒 Security Considerations

### EIP-1271 Signature Validation
- ✅ Verify order hash matches settlement terms
- ✅ Check option is expired
- ✅ Ensure not already settled
- ✅ Validate taker approval signature
- ✅ Check settlement state

### Hook Security
- ✅ Only CowSwap settlement contract can call hooks
- ✅ Validate proceeds meet minimum
- ✅ Atomic distribution in post-hook
- ✅ Reentrancy protection

### Settlement Terms
- ✅ Taker must explicitly approve terms
- ✅ Minimum output amount protection
- ✅ Time-bound validity
- ✅ Cannot modify after approval

---

## 💡 Future Enhancements

### Phase 2: Advanced Features
1. **Conditional Orders**
   - Settle only if profit > threshold
   - Time-weighted settlement strategies
   - Multi-leg settlement (options + spot)

2. **TWAP Settlement**
   - Use CowSwap TWAP orders
   - Gradual settlement over time
   - Reduce price impact

3. **Limit Orders**
   - Settle only at specific prices
   - Long-running settlement orders
   - Better execution guarantees

4. **Surplus Capture**
   - CowSwap often gets better prices
   - Share surplus with option holders
   - Incentivize settlement participation

---

## 📊 Comparison: Before vs After

| Feature | Current | With CowSwap |
|---------|---------|--------------|
| Write Offer | Gasless ✅ | Gasless ✅ |
| Take Option | Gas required | Gas required |
| Settlement | Gas required | **Gasless** ✅ |
| MEV Protection | ❌ | **Yes** ✅ |
| Price Optimization | Uniswap only | **Solver competition** ✅ |
| Conditional Logic | Limited | **Hooks** ✅ |
| User Experience | Good | **Excellent** ✅ |

---

## 🎉 Conclusion

CowSwap integration transforms the Options Protocol into a **fully gasless experience** for settlement while providing:
- Better prices through solver competition
- MEV protection via batch auctions
- Flexible settlement with taker approval
- Professional infrastructure (CowSwap)
- Token list integration
- Conditional settlement logic via hooks

This is a **major UX improvement** that makes the protocol more accessible and user-friendly while maintaining security and decentralization.

**Recommendation**: Implement this in **Phase 1.5** - it's a game-changer! 🚀
