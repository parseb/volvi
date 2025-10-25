import { getCollections } from './connection.js';
import type { Profile, Offer, Position, TransactionLog } from './schemas.js';

/**
 * Storage layer for database operations
 * Provides high-level methods for CRUD operations
 */

// ============================================================================
// PROFILES
// ============================================================================

export async function createProfile(profile: Omit<Profile, 'createdAt' | 'updatedAt'>): Promise<Profile> {
  const collections = getCollections();
  const now = new Date();

  const profileWithTimestamps: Profile = {
    ...profile,
    createdAt: now,
    updatedAt: now,
  };

  await collections.profiles.insertOne(profileWithTimestamps);
  return profileWithTimestamps;
}

export async function getProfileById(profileId: string): Promise<Profile | null> {
  const collections = getCollections();
  return await collections.profiles.findOne({ profileId });
}

export async function getProfilesByOwner(owner: string): Promise<Profile[]> {
  const collections = getCollections();
  return await collections.profiles
    .find({ owner })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function updateProfile(
  profileId: string,
  updates: Partial<Omit<Profile, 'profileId' | 'createdAt' | 'updatedAt'>>
): Promise<boolean> {
  const collections = getCollections();
  const result = await collections.profiles.updateOne(
    { profileId },
    { $set: { ...updates, updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

// ============================================================================
// OFFERS
// ============================================================================

export async function createOffer(offer: Omit<Offer, 'createdAt' | 'updatedAt' | 'filledAmount' | 'cancelled'>): Promise<Offer> {
  const collections = getCollections();
  const now = new Date();

  const offerWithDefaults: Offer = {
    ...offer,
    filledAmount: '0',
    cancelled: false,
    createdAt: now,
    updatedAt: now,
  };

  await collections.offers.insertOne(offerWithDefaults);
  return offerWithDefaults;
}

export async function getOfferByHash(offerHash: string): Promise<Offer | null> {
  const collections = getCollections();
  return await collections.offers.findOne({ offerHash });
}

export async function getActiveOffers(): Promise<Offer[]> {
  const collections = getCollections();
  const now = Math.floor(Date.now() / 1000);

  return await collections.offers
    .find({
      cancelled: false,
      deadline: { $gt: now },
    })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function getOffersByWriter(writer: string): Promise<Offer[]> {
  const collections = getCollections();
  return await collections.offers
    .find({ writer })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function getOffersByProfile(profileId: string): Promise<Offer[]> {
  const collections = getCollections();
  return await collections.offers
    .find({ profileId })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function updateOfferFilledAmount(offerHash: string, filledAmount: string): Promise<boolean> {
  const collections = getCollections();
  const result = await collections.offers.updateOne(
    { offerHash },
    { $set: { filledAmount, updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

export async function cancelOffer(offerHash: string): Promise<boolean> {
  const collections = getCollections();
  const result = await collections.offers.updateOne(
    { offerHash },
    { $set: { cancelled: true, updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

// ============================================================================
// POSITIONS
// ============================================================================

export async function createPosition(position: Omit<Position, 'createdAt' | 'updatedAt' | 'settled'>): Promise<Position> {
  const collections = getCollections();
  const now = new Date();

  const positionWithDefaults: Position = {
    ...position,
    settled: false,
    createdAt: now,
    updatedAt: now,
  };

  await collections.positions.insertOne(positionWithDefaults);
  return positionWithDefaults;
}

export async function getPositionByTokenId(tokenId: string): Promise<Position | null> {
  const collections = getCollections();
  return await collections.positions.findOne({ tokenId });
}

export async function getPositionsByOwner(owner: string, includeSettled: boolean = true): Promise<Position[]> {
  const collections = getCollections();
  const query: any = { owner };

  if (!includeSettled) {
    query.settled = false;
  }

  return await collections.positions
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();
}

export async function getPositionsByWriter(writer: string): Promise<Position[]> {
  const collections = getCollections();
  return await collections.positions
    .find({ writer })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function getExpiredPositions(): Promise<Position[]> {
  const collections = getCollections();
  const now = Math.floor(Date.now() / 1000);

  return await collections.positions
    .find({
      settled: false,
      expiry: { $lte: now },
    })
    .toArray();
}

export async function settlePosition(tokenId: string): Promise<boolean> {
  const collections = getCollections();
  const result = await collections.positions.updateOne(
    { tokenId },
    {
      $set: {
        settled: true,
        settledAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );
  return result.modifiedCount > 0;
}

// ============================================================================
// TRANSACTION LOGS
// ============================================================================

export async function logTransaction(log: Omit<TransactionLog, 'createdAt'>): Promise<void> {
  const collections = getCollections();
  const logWithTimestamp: TransactionLog = {
    ...log,
    createdAt: new Date(),
  };

  await collections.transactionLogs.insertOne(logWithTimestamp);
}

export async function getTransactionsByUser(user: string, limit: number = 100): Promise<TransactionLog[]> {
  const collections = getCollections();
  return await collections.transactionLogs
    .find({ user })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function getTransactionByHash(txHash: string): Promise<TransactionLog | null> {
  const collections = getCollections();
  return await collections.transactionLogs.findOne({ txHash });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get statistics about the protocol
 */
export async function getProtocolStats() {
  const collections = getCollections();

  const [totalProfiles, totalOffers, activeOffers, totalPositions, settledPositions] = await Promise.all([
    collections.profiles.countDocuments(),
    collections.offers.countDocuments(),
    collections.offers.countDocuments({
      cancelled: false,
      deadline: { $gt: Math.floor(Date.now() / 1000) },
    }),
    collections.positions.countDocuments(),
    collections.positions.countDocuments({ settled: true }),
  ]);

  return {
    totalProfiles,
    totalOffers,
    activeOffers,
    totalPositions,
    activePositions: totalPositions - settledPositions,
    settledPositions,
  };
}
