# CoW Protocol Backend Implementation Guide

## 🎯 Overview

The **frontend SettlementDialog is fully implemented** and ready to use. However, it calls 3 backend endpoints that **don't exist yet**. This guide explains exactly what needs to be implemented.

---

## 📍 Current Status

### ✅ What's Already Done

1. **Smart Contract** - `OptionsProtocolGasless.sol` (deployed on Base Sepolia)
   - `initiateSettlement()` function ✅
   - `approveSettlement()` function ✅
   - `postSettlementHook()` function ✅
   - EIP-1271 signature validation ✅

2. **Frontend** - `SettlementDialog.tsx` component
   - 5-step UI with progress tracking ✅
   - Real-time CoW status polling ✅
   - Input/output amount display ✅
   - Calls the 3 missing backend endpoints ✅

### ❌ What's Missing

**3 Backend API Endpoints** that the frontend is trying to call:
1. `POST /api/settlement/initiate`
2. `POST /api/settlement/approve`
3. `POST /api/settlement/submit`

---

## 🔧 Implementation Details

### Endpoint 1: `POST /api/settlement/initiate`

**Purpose:** Create CoW Protocol order and initiate settlement on-chain

**Called by:** Frontend when user clicks "Initiate Settlement"

**Request Body:**
```typescript
{
  tokenId: string,        // Option NFT ID
  minBuyAmount: string    // Minimum USDC output (5% slippage from payout)
}
```

**What it needs to do:**
1. Get option details from storage by tokenId
2. Calculate sell amount (option collateral)
3. Get current price from Pyth oracle
4. Calculate expected buy amount (USDC)
5. Create CoW order object with:
   - `sellToken`: Option underlying (e.g., WETH)
   - `buyToken`: USDC
   - `sellAmount`: Collateral amount
   - `buyAmount`: Minimum USDC (from request)
   - `validTo`: Current timestamp + 1 hour
   - `appData`: CoW hooks configuration
   - `kind`: "sell"
   - `partiallyFillable`: false
6. Hash the CoW order (EIP-712)
7. Call contract's `initiateSettlement()` with order hash
8. Store settlement terms in memory/database

**Response:**
```typescript
{
  order: {
    sellToken: string,
    buyToken: string,
    sellAmount: string,
    buyAmount: string,
    validTo: number,
    appData: string,
    feeAmount: string,
    kind: string,
    partiallyFillable: boolean
  },
  settlementConditionsHash: string,  // For taker to sign
  orderHash: string                  // CoW order hash
}
```

**Example Implementation:**
```typescript
router.post('/settlement/initiate', async (req: Request, res: Response) => {
  try {
    const { tokenId, minBuyAmount } = req.body;

    // 1. Get option from storage
    const option = storage.getActiveOptionByTokenId(tokenId);
    if (!option) {
      return res.status(404).json({ error: 'Option not found' });
    }

    // 2. Validate option is expired
    if (Date.now() / 1000 < option.expiryTime) {
      return res.status(400).json({ error: 'Option not expired yet' });
    }

    // 3. Create CoW order
    const order = {
      sellToken: option.underlying,
      buyToken: USDC_ADDRESS,
      receiver: PROTOCOL_ADDRESS,  // Protocol receives proceeds
      sellAmount: option.collateralLocked.toString(),
      buyAmount: minBuyAmount,
      validTo: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      appData: createAppData(tokenId), // Include hooks
      feeAmount: "0",
      kind: "sell",
      partiallyFillable: false,
      sellTokenBalance: "erc20",
      buyTokenBalance: "erc20"
    };

    // 4. Hash the order (EIP-712)
    const orderHash = hashCowOrder(order);

    // 5. Call contract initiateSettlement()
    const tx = await protocolContract.initiateSettlement(
      tokenId,
      orderHash,
      minBuyAmount,
      order.validTo,
      order.appData
    );
    await tx.wait();

    // 6. Create settlement conditions hash for taker to sign
    const settlementConditionsHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'bytes32', 'uint256', 'uint64'],
        [tokenId, orderHash, minBuyAmount, order.validTo]
      )
    );

    // 7. Store in memory
    storage.storeSettlement(tokenId, {
      order,
      orderHash,
      settlementConditionsHash,
      status: 'initiated'
    });

    res.json({
      order,
      settlementConditionsHash,
      orderHash
    });

  } catch (error) {
    console.error('Settlement initiation failed:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

### Endpoint 2: `POST /api/settlement/approve`

**Purpose:** Store taker's approval signature and call contract

**Called by:** Frontend after user signs EIP-712 approval message

**Request Body:**
```typescript
{
  tokenId: string,
  settlementConditionsHash: string,
  takerSignature: string  // EIP-712 signature from taker
}
```

**What it needs to do:**
1. Validate tokenId exists in pending settlements
2. Verify signature matches settlement conditions hash
3. Call contract's `approveSettlement()` with signature
4. Update settlement status to 'approved'
5. Prepare EIP-1271 signature for CoW (tokenId + taker signature)

**Response:**
```typescript
{
  success: boolean,
  eip1271Signature: string  // Encoded: tokenId (32 bytes) + taker signature
}
```

**Example Implementation:**
```typescript
router.post('/settlement/approve', async (req: Request, res: Response) => {
  try {
    const { tokenId, settlementConditionsHash, takerSignature } = req.body;

    // 1. Get settlement from storage
    const settlement = storage.getSettlement(tokenId);
    if (!settlement) {
      return res.status(404).json({ error: 'Settlement not found' });
    }

    // 2. Verify conditions hash matches
    if (settlement.settlementConditionsHash !== settlementConditionsHash) {
      return res.status(400).json({ error: 'Conditions hash mismatch' });
    }

    // 3. Call contract approveSettlement()
    const tx = await protocolContract.approveSettlement(
      tokenId,
      takerSignature
    );
    await tx.wait();

    // 4. Create EIP-1271 signature (tokenId + taker signature)
    // This is what CoW will use to validate via isValidSignature()
    const eip1271Signature = ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint256', 'bytes'],
      [tokenId, takerSignature]
    );

    // 5. Update settlement status
    settlement.status = 'approved';
    settlement.eip1271Signature = eip1271Signature;
    storage.updateSettlement(tokenId, settlement);

    res.json({
      success: true,
      eip1271Signature
    });

  } catch (error) {
    console.error('Settlement approval failed:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

### Endpoint 3: `POST /api/settlement/submit`

**Purpose:** Submit the order to CoW Protocol API

**Called by:** Frontend after approval is complete

**Request Body:**
```typescript
{
  tokenId: string,
  order: CowOrder,           // From initiate response
  eip1271Signature: string   // From approve response
}
```

**What it needs to do:**
1. Get settlement from storage
2. Format order for CoW API
3. Submit to CoW Protocol API
4. Store order UID
5. Return UID to frontend for polling

**Response:**
```typescript
{
  orderUid: string  // CoW order UID for tracking
}
```

**CoW API Endpoint:**
- **Base Sepolia:** `https://api.cow.fi/basesepolia/api/v1/orders`
- **Sepolia:** `https://api.cow.fi/sepolia/api/v1/orders`
- **Mainnet:** `https://api.cow.fi/mainnet/api/v1/orders`

**Example Implementation:**
```typescript
router.post('/settlement/submit', async (req: Request, res: Response) => {
  try {
    const { tokenId, order, eip1271Signature } = req.body;

    // 1. Get settlement from storage
    const settlement = storage.getSettlement(tokenId);
    if (!settlement || settlement.status !== 'approved') {
      return res.status(400).json({ error: 'Settlement not approved' });
    }

    // 2. Format order for CoW API
    const cowOrder = {
      sellToken: order.sellToken,
      buyToken: order.buyToken,
      receiver: PROTOCOL_ADDRESS,  // Contract receives proceeds
      sellAmount: order.sellAmount,
      buyAmount: order.buyAmount,
      validTo: order.validTo,
      appData: order.appData,
      feeAmount: order.feeAmount,
      kind: order.kind,
      partiallyFillable: order.partiallyFillable,
      sellTokenBalance: "erc20",
      buyTokenBalance: "erc20",
      signingScheme: "eip1271",  // Contract signature
      signature: eip1271Signature,
      from: PROTOCOL_ADDRESS  // Contract is the signer
    };

    // 3. Submit to CoW API
    const cowApiUrl = process.env.COW_API_URL || 'https://api.cow.fi/basesepolia/api/v1/orders';

    const response = await fetch(cowApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cowOrder)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`CoW API error: ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    const orderUid = result; // CoW API returns the UID as string

    // 4. Store order UID
    settlement.orderUid = orderUid;
    settlement.status = 'submitted';
    storage.updateSettlement(tokenId, settlement);

    res.json({ orderUid });

  } catch (error) {
    console.error('Settlement submission failed:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## 🔗 Helper Functions Needed

### 1. Hash CoW Order (EIP-712)

```typescript
import { TypedDataDomain, TypedDataField } from 'ethers';

const COW_DOMAIN = {
  name: 'Gnosis Protocol',
  version: 'v2',
  chainId: 84532, // Base Sepolia
  verifyingContract: '0x9008D19f58AAbD9eD0D60971565AA8510560ab41' // CoW Settlement
};

const COW_ORDER_TYPE = {
  Order: [
    { name: 'sellToken', type: 'address' },
    { name: 'buyToken', type: 'address' },
    { name: 'receiver', type: 'address' },
    { name: 'sellAmount', type: 'uint256' },
    { name: 'buyAmount', type: 'uint256' },
    { name: 'validTo', type: 'uint32' },
    { name: 'appData', type: 'bytes32' },
    { name: 'feeAmount', type: 'uint256' },
    { name: 'kind', type: 'string' },
    { name: 'partiallyFillable', type: 'bool' },
    { name: 'sellTokenBalance', type: 'string' },
    { name: 'buyTokenBalance', type: 'string' }
  ]
};

function hashCowOrder(order: any): string {
  return ethers.TypedDataEncoder.hash(
    COW_DOMAIN,
    COW_ORDER_TYPE,
    order
  );
}
```

### 2. Create AppData (CoW Hooks)

```typescript
function createAppData(tokenId: string): string {
  // AppData includes hooks configuration
  const appDataDoc = {
    version: "0.1.0",
    metadata: {
      hooks: {
        pre: [{
          target: PROTOCOL_ADDRESS,
          callData: protocolContract.interface.encodeFunctionData(
            'preSettlementHook',
            [tokenId]
          ),
          gasLimit: "100000"
        }],
        post: [{
          target: PROTOCOL_ADDRESS,
          callData: protocolContract.interface.encodeFunctionData(
            'postSettlementHook',
            [tokenId, '0'] // proceedsReceived filled by CoW
          ),
          gasLimit: "200000"
        }]
      }
    }
  };

  // Hash the appData document
  const appDataJson = JSON.stringify(appDataDoc);
  return ethers.keccak256(ethers.toUtf8Bytes(appDataJson));
}
```

### 3. Storage Extension

Add to `backend/src/storage.ts`:

```typescript
interface Settlement {
  order: any;
  orderHash: string;
  settlementConditionsHash: string;
  eip1271Signature?: string;
  orderUid?: string;
  status: 'initiated' | 'approved' | 'submitted' | 'completed';
}

class Storage {
  private settlements: Map<string, Settlement> = new Map();

  storeSettlement(tokenId: string, settlement: Settlement) {
    this.settlements.set(tokenId, settlement);
  }

  getSettlement(tokenId: string): Settlement | undefined {
    return this.settlements.get(tokenId);
  }

  updateSettlement(tokenId: string, settlement: Settlement) {
    this.settlements.set(tokenId, settlement);
  }
}
```

---

## 🌐 CoW Protocol API Reference

### Submit Order
```
POST https://api.cow.fi/basesepolia/api/v1/orders
```

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "sellToken": "0x4200000000000000000000000000000000000006",
  "buyToken": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  "receiver": "0xD7AFfB2B3303e9Cb44C9d9aFA6bD938200b3C8F2",
  "sellAmount": "1000000000000000000",
  "buyAmount": "2400000000",
  "validTo": 1728765600,
  "appData": "0x...",
  "feeAmount": "0",
  "kind": "sell",
  "partiallyFillable": false,
  "sellTokenBalance": "erc20",
  "buyTokenBalance": "erc20",
  "signingScheme": "eip1271",
  "signature": "0x...",
  "from": "0xD7AFfB2B3303e9Cb44C9d9aFA6bD938200b3C8F2"
}
```

**Response:**
```
"0x..." // Order UID (string)
```

### Get Order Status
```
GET https://api.cow.fi/basesepolia/api/v1/orders/{orderUid}
```

**Response:**
```json
{
  "uid": "0x...",
  "status": "open" | "fulfilled" | "cancelled" | "expired",
  "creationDate": "2024-10-12T12:00:00Z",
  "sellToken": "0x...",
  "buyToken": "0x...",
  "sellAmount": "1000000000000000000",
  "buyAmount": "2400000000",
  ...
}
```

---

## 📦 Required Dependencies

Add to `backend/package.json`:

```json
{
  "dependencies": {
    "ethers": "^6.9.0",
    "express": "^4.18.2",
    "node-fetch": "^3.3.2"
  }
}
```

---

## 🧪 Testing Flow

### 1. Local Testing (without CoW)

You can test the endpoints without actually submitting to CoW:

```typescript
// In submit endpoint, skip CoW API call for local testing
if (process.env.NODE_ENV === 'development') {
  const mockOrderUid = ethers.id('mock-order-' + tokenId);
  return res.json({ orderUid: mockOrderUid });
}
```

### 2. Base Sepolia Testing (with real CoW)

```bash
# 1. Deploy contract
forge script script/DeployBaseSepoliaGasless.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast

# 2. Start backend with CoW API
COW_API_URL=https://api.cow.fi/basesepolia/api/v1/orders npm run dev:backend

# 3. Create and take option
# 4. Try settlement through frontend
# 5. Monitor CoW API for order status
```

### 3. Monitor Settlement

```bash
# Check order status
curl https://api.cow.fi/basesepolia/api/v1/orders/{orderUid}

# Check contract settlement state
cast call $PROTOCOL_ADDRESS "settlementStates(uint256)" $TOKEN_ID --rpc-url $BASE_SEPOLIA_RPC_URL
```

---

## ⚠️ Important Notes

### 1. Contract Approval
Before settlement works, the protocol contract needs to approve CoW to spend its tokens:

```solidity
// In contract or via admin call
IERC20(underlying).approve(cowSettlement, type(uint256).max);
```

### 2. AppData Hooks
The hooks (pre/post settlement) are critical. CoW will call these before and after executing the swap.

### 3. EIP-1271 Validation
The contract's `isValidSignature()` function validates:
- Order hash matches stored terms
- Option is expired
- Settlement is approved by taker
- Settlement state is InSettlement

### 4. Error Handling
Common errors:
- "Order already exists" - Order was already submitted
- "Invalid signature" - EIP-1271 validation failed
- "Insufficient liquidity" - No solver can fill the order
- "Expired" - Order validTo timestamp passed

---

## 📊 Estimated Implementation Time

- **Endpoint 1 (initiate):** 2-3 hours
- **Endpoint 2 (approve):** 1-2 hours
- **Endpoint 3 (submit):** 1-2 hours
- **Helper functions:** 1 hour
- **Testing & debugging:** 2 hours

**Total:** 4-6 hours for experienced developer

---

## 🎯 Summary

**What you need to build:**
1. 3 API endpoints in `backend/src/routes.ts`
2. CoW order hashing function (EIP-712)
3. AppData creation with hooks
4. Storage extension for settlements
5. Integration with CoW API

**What you already have:**
- ✅ Smart contract with all settlement functions
- ✅ Frontend UI that calls these endpoints
- ✅ Contract deployed on Base Sepolia

**Once implemented:**
- Users can settle options gaslessly
- CoW Protocol finds best prices
- MEV protection included
- Fully automated settlement flow

---

## 📚 Resources

- **CoW Protocol Docs:** https://docs.cow.fi/
- **Order API:** https://docs.cow.fi/cow-protocol/reference/apis/orderbook
- **EIP-1271:** https://eips.ethereum.org/EIPS/eip-1271
- **AppData Docs:** https://docs.cow.fi/cow-protocol/reference/core/intents/app-data
- **Hooks:** https://docs.cow.fi/cow-protocol/reference/core/intents/hooks

---

Need help implementing? The structure is clear, the contract is ready, and the frontend is waiting! 🚀
