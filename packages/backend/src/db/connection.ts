import { MongoClient, Db, Collection } from 'mongodb';
import type { Profile, Offer, Position, TransactionLog } from './schemas';

/**
 * MongoDB connection and database instance
 */

let client: MongoClient | null = null;
let db: Db | null = null;

export interface Collections {
  profiles: Collection<Profile>;
  offers: Collection<Offer>;
  positions: Collection<Position>;
  transactionLogs: Collection<TransactionLog>;
}

/**
 * Connect to MongoDB
 */
export async function connectToDatabase(mongoUri: string): Promise<Db> {
  if (db) {
    return db;
  }

  try {
    client = new MongoClient(mongoUri);
    await client.connect();

    db = client.db('volvi-options');

    console.log('✅ Connected to MongoDB');

    // Create indexes for better query performance
    await createIndexes(db);

    return db;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }
}

/**
 * Get database instance (must be connected first)
 */
export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not connected. Call connectToDatabase first.');
  }
  return db;
}

/**
 * Get collections with proper typing
 */
export function getCollections(): Collections {
  const database = getDatabase();

  return {
    profiles: database.collection<Profile>('profiles'),
    offers: database.collection<Offer>('offers'),
    positions: database.collection<Position>('positions'),
    transactionLogs: database.collection<TransactionLog>('transaction_logs'),
  };
}

/**
 * Create database indexes for optimized queries
 */
async function createIndexes(database: Db): Promise<void> {
  try {
    // Profiles indexes
    await database.collection('profiles').createIndex({ profileId: 1 }, { unique: true });
    await database.collection('profiles').createIndex({ owner: 1 });
    await database.collection('profiles').createIndex({ createdAt: -1 });

    // Offers indexes
    await database.collection('offers').createIndex({ offerHash: 1 }, { unique: true });
    await database.collection('offers').createIndex({ writer: 1 });
    await database.collection('offers').createIndex({ profileId: 1 });
    await database.collection('offers').createIndex({ cancelled: 1 });
    await database.collection('offers').createIndex({ deadline: 1 });
    await database.collection('offers').createIndex({ createdAt: -1 });
    // Compound index for active offers query
    await database.collection('offers').createIndex({ cancelled: 1, deadline: 1 });

    // Positions indexes
    await database.collection('positions').createIndex({ tokenId: 1 }, { unique: true });
    await database.collection('positions').createIndex({ owner: 1 });
    await database.collection('positions').createIndex({ writer: 1 });
    await database.collection('positions').createIndex({ settled: 1 });
    await database.collection('positions').createIndex({ expiry: 1 });
    await database.collection('positions').createIndex({ createdAt: -1 });
    // Compound index for user positions query
    await database.collection('positions').createIndex({ owner: 1, settled: 1 });

    // Transaction logs indexes
    await database.collection('transaction_logs').createIndex({ txHash: 1 }, { unique: true });
    await database.collection('transaction_logs').createIndex({ user: 1 });
    await database.collection('transaction_logs').createIndex({ type: 1 });
    await database.collection('transaction_logs').createIndex({ createdAt: -1 });

    console.log('✅ Database indexes created');
  } catch (error) {
    console.error('⚠️  Warning: Failed to create some indexes:', error);
    // Don't throw - indexes are optimization, not critical
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectFromDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('✅ Disconnected from MongoDB');
  }
}

/**
 * Health check for database connection
 */
export async function isDatabaseConnected(): Promise<boolean> {
  try {
    if (!db) return false;
    await db.admin().ping();
    return true;
  } catch {
    return false;
  }
}
