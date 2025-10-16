# Production Storage Strategy for Options Protocol

## Current State (MVP)

**Current Implementation:** In-memory storage ([backend/src/storage.ts](backend/src/storage.ts:18))

**Limitations:**
- ❌ Data lost on server restart
- ❌ No persistence across deployments
- ❌ Can't scale horizontally (no shared state)
- ❌ No backup/recovery
- ❌ No indexing for complex queries

**What's Stored:**
1. **Signed Orders (Offers)** - EIP-712 signed option offers with signatures
2. **Active Options** - Minted option NFTs and their state
3. **Filled Amounts** - Tracking partial fills per offer
4. **Settlements** - CoW Protocol settlement state and signatures

---

## Production Storage Recommendation

### **Primary: PostgreSQL + Redis**

This is the recommended production architecture for a centralized orderbook.

#### **PostgreSQL (Persistent Storage)**

Use for long-term data that needs ACID guarantees:

```sql
-- Signed Orders/Offers
CREATE TABLE offers (
    offer_hash VARCHAR(66) PRIMARY KEY,
    writer_address VARCHAR(42) NOT NULL,
    underlying_address VARCHAR(42) NOT NULL,
    collateral_amount NUMERIC(78, 0) NOT NULL, -- uint256 as string
    stablecoin_address VARCHAR(42) NOT NULL,
    is_call BOOLEAN NOT NULL,
    premium_per_day NUMERIC(78, 0) NOT NULL,
    min_duration INTEGER NOT NULL,
    max_duration INTEGER NOT NULL,
    min_fill_amount NUMERIC(78, 0) NOT NULL,
    deadline BIGINT NOT NULL, -- Unix timestamp
    config_hash VARCHAR(66) NOT NULL,
    signature TEXT NOT NULL, -- EIP-712 signature
    created_at TIMESTAMP DEFAULT NOW(),
    cancelled_at TIMESTAMP NULL,
    expires_at TIMESTAMP NOT NULL,
    INDEX idx_underlying (underlying_address),
    INDEX idx_writer (writer_address),
    INDEX idx_is_call (is_call),
    INDEX idx_expires_at (expires_at)
);

-- Active Options
CREATE TABLE active_options (
    token_id VARCHAR(78) PRIMARY KEY,
    offer_hash VARCHAR(66) NOT NULL REFERENCES offers(offer_hash),
    writer_address VARCHAR(42) NOT NULL,
    taker_address VARCHAR(42) NOT NULL,
    underlying_address VARCHAR(42) NOT NULL,
    collateral_locked NUMERIC(78, 0) NOT NULL,
    is_call BOOLEAN NOT NULL,
    strike_price NUMERIC(78, 0) NOT NULL, -- 8 decimals
    start_time BIGINT NOT NULL,
    expiry_time BIGINT NOT NULL,
    settled BOOLEAN DEFAULT FALSE,
    config_hash VARCHAR(66) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    settled_at TIMESTAMP NULL,
    INDEX idx_taker (taker_address),
    INDEX idx_writer (writer_address),
    INDEX idx_expiry (expiry_time),
    INDEX idx_settled (settled)
);

-- Filled Amounts (for partial fills)
CREATE TABLE filled_amounts (
    offer_hash VARCHAR(66) PRIMARY KEY REFERENCES offers(offer_hash),
    filled_amount NUMERIC(78, 0) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Settlements (CoW Protocol)
CREATE TABLE settlements (
    token_id VARCHAR(78) PRIMARY KEY REFERENCES active_options(token_id),
    order_hash VARCHAR(66) NOT NULL,
    cow_order JSONB NOT NULL, -- Full CoW order object
    settlement_conditions_hash VARCHAR(66) NOT NULL,
    taker_signature TEXT NULL,
    eip1271_signature TEXT NULL,
    order_uid VARCHAR(114) NULL, -- CoW order UID
    status VARCHAR(20) NOT NULL, -- 'initiated', 'approved', 'submitted', 'completed', 'failed'
    min_buy_amount NUMERIC(78, 0) NOT NULL,
    valid_to BIGINT NOT NULL,
    app_data VARCHAR(66) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_status (status),
    INDEX idx_order_uid (order_uid)
);

-- Transaction Logs (for audit trail)
CREATE TABLE transaction_logs (
    id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(66) NULL,
    event_type VARCHAR(50) NOT NULL, -- 'offer_created', 'option_taken', 'settlement_initiated', etc.
    related_id VARCHAR(78) NOT NULL, -- offer_hash, token_id, etc.
    data JSONB NOT NULL,
    block_number BIGINT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_event_type (event_type),
    INDEX idx_related_id (related_id),
    INDEX idx_block_number (block_number)
);
```

**Why PostgreSQL?**
- ✅ ACID transactions for critical data
- ✅ Complex queries and joins
- ✅ Proven reliability and performance
- ✅ Excellent indexing for orderbook queries
- ✅ Native JSON support for flexible data
- ✅ Easy backup and replication

#### **Redis (Caching Layer)**

Use for high-frequency reads and real-time data:

```typescript
// Hot orderbook cache (refreshed every 10s)
SET orderbook:weth:call '[{...}, {...}]' EX 10

// Active offer quick lookup
HSET offer:{offerHash} writer "0x..." collateral "1000000000000000000"

// Filled amounts (frequently updated)
SET filled:{offerHash} "500000000000000000"

// User positions cache
SET positions:{address} '[{...}, {...}]' EX 30

// Settlement status (during active settlement)
HSET settlement:{tokenId} status "initiated" orderHash "0x..."
```

**Why Redis?**
- ✅ Sub-millisecond response times
- ✅ Reduces database load
- ✅ Perfect for orderbook queries
- ✅ TTL for auto-expiring data
- ✅ Pub/Sub for real-time updates

---

## Alternative: Decentralized Storage

### **Option 1: GunDB (P2P Database)**

Fully decentralized, serverless orderbook:

```typescript
// Initialize Gun
import Gun from 'gun';
const gun = Gun(['https://relay1.com/gun', 'https://relay2.com/gun']);

// Store signed offer
gun.get('offers')
   .get(offerHash)
   .put({
     offer: { /* offer data */ },
     signature,
     timestamp: Date.now()
   });

// Subscribe to orderbook updates
gun.get('offers')
   .map()
   .on((offer, hash) => {
     // Real-time orderbook updates
     console.log('New offer:', hash, offer);
   });
```

**Pros:**
- ✅ No central server needed
- ✅ Censorship resistant
- ✅ Real-time P2P synchronization
- ✅ Scales with users

**Cons:**
- ❌ Complex queries difficult
- ❌ No guaranteed data persistence
- ❌ Harder to debug
- ❌ Requires relay peers

### **Option 2: IPFS + Ceramic**

Permanent storage with mutable documents:

```typescript
import { CeramicClient } from '@ceramicnetwork/http-client';
import { DID } from 'dids';

const ceramic = new CeramicClient('https://ceramic-node.com');

// Create offer document
const offerDoc = await ceramic.createDocument('tile', {
  content: {
    offer,
    signature,
    timestamp: Date.now()
  }
});

// Pin to IPFS for permanence
await ipfs.pin.add(offerDoc.commitId);
```

**Pros:**
- ✅ Immutable audit trail
- ✅ Content-addressed storage
- ✅ Decentralized

**Cons:**
- ❌ Not suitable for frequently updated data
- ❌ Requires pinning services
- ❌ Higher latency

### **Option 3: The Graph (Indexer)**

Index on-chain events, serve via GraphQL:

```graphql
type Offer @entity {
  id: ID! # offerHash
  writer: Bytes!
  underlying: Bytes!
  collateralAmount: BigInt!
  premiumPerDay: BigInt!
  signature: Bytes!
  createdBlock: BigInt!
  filledAmount: BigInt!
}

type ActiveOption @entity {
  id: ID! # tokenId
  offer: Offer!
  taker: Bytes!
  strikePrice: BigInt!
  expiryTime: BigInt!
  settled: Boolean!
}
```

**Pros:**
- ✅ Trustless (indexes blockchain)
- ✅ GraphQL API
- ✅ Real-time subscriptions

**Cons:**
- ❌ Only works for on-chain data
- ❌ Gasless offers not on-chain
- ❌ Higher cost (indexing + querying)

---

## Recommended Production Architecture

### **Hybrid Approach: PostgreSQL + Redis + The Graph**

```
┌─────────────────┐
│   Frontend      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│         Backend API                 │
│  ┌──────────────────────────────┐  │
│  │  Express Routes              │  │
│  │  - POST /offers              │  │
│  │  - GET /orderbook/:token     │  │
│  │  - POST /settlement/initiate │  │
│  └──────────────────────────────┘  │
│               │                     │
│      ┌────────┴────────┐           │
│      ▼                 ▼           │
│  ┌─────────┐      ┌─────────┐     │
│  │  Redis  │◄────►│ Postgres│     │
│  │  Cache  │      │   DB    │     │
│  └─────────┘      └─────────┘     │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Blockchain     │
│  (Events)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  The Graph      │
│  (Indexer)      │
└─────────────────┘
```

**Data Flow:**

1. **Signed Offers (Off-chain):**
   - Store in PostgreSQL (permanent)
   - Cache in Redis (fast access)
   - No blockchain storage (gasless)

2. **Active Options (On-chain events):**
   - Index via The Graph
   - Cache in Redis
   - Store in PostgreSQL for API

3. **Settlements:**
   - PostgreSQL for state management
   - CoW Protocol API for orders
   - The Graph for settlement events

---

## Implementation Priority

### **Phase 1: MVP → Production (Immediate)**
```bash
npm install pg redis ioredis
```

**Files to Create:**
1. `backend/src/db/postgres.ts` - PostgreSQL client & schema
2. `backend/src/db/redis.ts` - Redis client & cache helpers
3. `backend/src/db/migrations/` - SQL migration files

**Migration Strategy:**
```typescript
// backend/src/db/storage-adapter.ts
export interface IStorage {
  addOffer(offer: OptionOffer): Promise<void>;
  getOffer(hash: string): Promise<OptionOffer | null>;
  // ... etc
}

// Replace in-memory with PostgreSQL
export class PostgresStorage implements IStorage {
  async addOffer(offer: OptionOffer): Promise<void> {
    await pool.query(
      `INSERT INTO offers (...) VALUES (...)`,
      [/* values */]
    );
    // Invalidate Redis cache
    await redis.del(`offer:${offer.offerHash}`);
  }
}
```

### **Phase 2: Indexing (Next)**
- Set up The Graph subgraph
- Index OptionTaken, SettlementInitiated events
- GraphQL API for historical data

### **Phase 3: Decentralization (Future)**
- Add GunDB as optional P2P layer
- IPFS for offer archival
- Fully decentralized orderbook option

---

## Security Considerations

### **Signature Verification**
```typescript
// Always verify signatures server-side
import { ethers } from 'ethers';

function verifyOfferSignature(offer: OptionOffer, signature: string): boolean {
  const domain = {
    name: 'OptionsProtocol',
    version: '1',
    chainId: config.chainId,
    verifyingContract: config.protocolAddress
  };

  const types = {
    OptionOffer: [/* EIP-712 types */]
  };

  const recovered = ethers.verifyTypedData(domain, types, offer, signature);
  return recovered.toLowerCase() === offer.writer.toLowerCase();
}
```

### **Rate Limiting**
```typescript
import rateLimit from 'express-rate-limit';

const createOfferLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 offers per 15 min
  message: 'Too many offers created'
});

app.post('/offers', createOfferLimiter, async (req, res) => {
  // ...
});
```

### **Data Validation**
```typescript
import { z } from 'zod';

const OfferSchema = z.object({
  writer: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  collateralAmount: z.string().regex(/^\d+$/),
  deadline: z.number().min(Date.now() / 1000),
  // ... etc
});

// Validate before storing
const validated = OfferSchema.parse(req.body.offer);
```

---

## Cost Estimates

### **PostgreSQL (Managed)**
- **Heroku Postgres:** $9/month (Standard 0) - Good for MVP
- **AWS RDS:** $15-50/month depending on size
- **DigitalOcean:** $15/month (1GB RAM, 10GB storage)

### **Redis (Managed)**
- **Redis Labs:** Free tier (30MB) for testing
- **AWS ElastiCache:** $15/month (cache.t3.micro)
- **Upstash:** $0.20/100K commands (serverless)

### **The Graph**
- **Hosted Service:** Free for testnets
- **Mainnet:** ~$0.0001 per query (very cheap)
- **Self-hosted:** Infrastructure costs only

**Total Estimated Cost:** $30-70/month for production-ready setup

---

## Migration Checklist

- [ ] Set up PostgreSQL database
- [ ] Create database schema (tables, indexes)
- [ ] Set up Redis instance
- [ ] Implement storage adapter interface
- [ ] Write migration scripts (in-memory → PostgreSQL)
- [ ] Add database connection pooling
- [ ] Implement caching layer (Redis)
- [ ] Add signature verification
- [ ] Set up rate limiting
- [ ] Configure database backups
- [ ] Set up The Graph subgraph
- [ ] Test data persistence across restarts
- [ ] Load testing (concurrent users)
- [ ] Monitoring and alerting (errors, slow queries)

---

## Quick Start: PostgreSQL Setup

```bash
# Install dependencies
npm install pg @types/pg

# Create database
createdb options_protocol

# Run migrations
psql options_protocol < backend/db/schema.sql
```

```typescript
// backend/src/db/postgres.ts
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'options_protocol',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // connection pool size
  idleTimeoutMillis: 30000,
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('Database connection failed:', err);
  else console.log('Database connected:', res.rows[0].now);
});
```

---

## Conclusion

**Recommended for Production:**
1. **PostgreSQL** - Persistent storage, complex queries
2. **Redis** - High-speed cache, orderbook queries
3. **The Graph** - On-chain event indexing

This gives you:
- ✅ Data persistence and reliability
- ✅ Fast orderbook queries (<10ms)
- ✅ Scalability (horizontal + caching)
- ✅ Real-time updates
- ✅ Audit trail and compliance
- ✅ Reasonable costs ($30-70/month)

Start with PostgreSQL + Redis for immediate production readiness, then add The Graph for enhanced on-chain data access.
