import { OptionOffer, ActiveOption, OrderbookEntry } from './types.js';
import { PostgresStorage, IStorage } from './db/postgres.js';
import { RedisCache, getRedisCache } from './db/redis.js';

export interface Settlement {
  tokenId: string;
  order: any;
  orderHash: string;
  settlementConditionsHash: string;
  eip1271Signature?: string;
  orderUid?: string;
  status: 'initiated' | 'approved' | 'submitted' | 'completed';
  createdAt: number;
}

/**
 * In-memory storage for MVP
 * TODO: Migrate to PostgreSQL or GunDB later
 */
class InMemoryStorage implements IStorage {
  private offers: Map<string, OptionOffer> = new Map();
  private activeOptions: Map<string, ActiveOption> = new Map();
  private filledAmounts: Map<string, string> = new Map();
  private settlements: Map<string, Settlement> = new Map();

  // Offers
  async addOffer(offer: OptionOffer): Promise<void> {
    this.offers.set(offer.offerHash, offer);
  }

  async getOffer(offerHash: string): Promise<OptionOffer | undefined> {
    return this.offers.get(offerHash);
  }

  async getAllOffers(): Promise<OptionOffer[]> {
    return Array.from(this.offers.values());
  }

  async getOffersByToken(underlying: string, isCall: boolean): Promise<OptionOffer[]> {
    return Array.from(this.offers.values()).filter(
      (offer) => offer.underlying.toLowerCase() === underlying.toLowerCase() && offer.isCall === isCall
    );
  }

  async deleteOffer(offerHash: string): Promise<void> {
    this.offers.delete(offerHash);
  }

  // Active Options
  async addActiveOption(option: ActiveOption): Promise<void> {
    this.activeOptions.set(option.tokenId, option);
  }

  async getActiveOption(tokenId: string): Promise<ActiveOption | undefined> {
    return this.activeOptions.get(tokenId);
  }

  async getActiveOptionsByTaker(taker: string): Promise<ActiveOption[]> {
    return Array.from(this.activeOptions.values()).filter(
      (option) => option.taker.toLowerCase() === taker.toLowerCase() && !option.settled
    );
  }

  async getActiveOptionsByWriter(writer: string): Promise<ActiveOption[]> {
    return Array.from(this.activeOptions.values()).filter(
      (option) => option.writer.toLowerCase() === writer.toLowerCase() && !option.settled
    );
  }

  async getActiveOptionsByOffer(offerHash: string): Promise<ActiveOption[]> {
    return Array.from(this.activeOptions.values()).filter(
      (option) => option.offerHash === offerHash && !option.settled
    );
  }

  async settleOption(tokenId: string): Promise<void> {
    const option = this.activeOptions.get(tokenId);
    if (option) {
      option.settled = true;
      this.activeOptions.set(tokenId, option);
    }
  }

  // Filled Amounts
  async updateFilledAmount(offerHash: string, amount: string): Promise<void> {
    const current = this.filledAmounts.get(offerHash) || '0';
    const newAmount = (BigInt(current) + BigInt(amount)).toString();
    this.filledAmounts.set(offerHash, newAmount);
  }

  async getFilledAmount(offerHash: string): Promise<string> {
    return this.filledAmounts.get(offerHash) || '0';
  }

  // Orderbook utilities
  async getOrderbook(underlying: string, isCall?: boolean, filters?: {
    minDuration?: number;
    maxDuration?: number;
    minSize?: string;
  }): Promise<OrderbookEntry[]> {
    let offers = isCall !== undefined
      ? await this.getOffersByToken(underlying, isCall)
      : Array.from(this.offers.values()).filter(
          (offer) => offer.underlying.toLowerCase() === underlying.toLowerCase()
        );

    // Apply filters
    if (filters) {
      if (filters.minDuration !== undefined) {
        offers = offers.filter(o => o.maxDuration >= filters.minDuration!);
      }
      if (filters.maxDuration !== undefined) {
        offers = offers.filter(o => o.minDuration <= filters.maxDuration!);
      }
    }

    // Calculate remaining amounts and convert to OrderbookEntry
    const entries: OrderbookEntry[] = await Promise.all(offers.map(async offer => {
      const filledAmount = await this.getFilledAmount(offer.offerHash);
      const remainingAmount = (BigInt(offer.collateralAmount) - BigInt(filledAmount)).toString();

      // Filter by min size if specified
      if (filters?.minSize && BigInt(remainingAmount) < BigInt(filters.minSize)) {
        return null;
      }

      // Calculate total premium (premiumPerDay * remainingAmount)
      const totalPremium = (BigInt(offer.premiumPerDay) * BigInt(remainingAmount) / BigInt(offer.collateralAmount)).toString();

      return {
        ...offer,
        remainingAmount,
        filledAmount,
        totalPremium,
        isValid: BigInt(remainingAmount) > 0 && Number(offer.deadline) > Math.floor(Date.now() / 1000)
      };
    })).filter(entry => entry !== null) as OrderbookEntry[];

    // Sort by totalPremium (price × size) ascending
    return entries
      .filter(e => e.isValid)
      .sort((a, b) => {
        const diff = BigInt(a.totalPremium) - BigInt(b.totalPremium);
        return diff > 0n ? 1 : diff < 0n ? -1 : 0;
      });
  }

  // Settlements
  async addSettlement(settlement: Settlement): Promise<void> {
    this.settlements.set(settlement.tokenId, settlement);
  }

  async getSettlement(tokenId: string): Promise<Settlement | undefined> {
    return this.settlements.get(tokenId);
  }

  async updateSettlement(tokenId: string, updates: Partial<Settlement>): Promise<void> {
    const existing = this.settlements.get(tokenId);
    if (existing) {
      this.settlements.set(tokenId, { ...existing, ...updates });
    }
  }

  async getAllSettlements(): Promise<Settlement[]> {
    return Array.from(this.settlements.values());
  }

  // Clear all data (for testing)
  async clear(): Promise<void> {
    this.offers.clear();
    this.activeOptions.clear();
    this.filledAmounts.clear();
    this.settlements.clear();
  }
}

// Storage factory - chooses between in-memory and PostgreSQL based on environment
function createStorage(): IStorage {
  const usePostgres = process.env.USE_POSTGRES === 'true';

  if (usePostgres) {
    console.log('Using PostgreSQL storage');
    return new PostgresStorage();
  } else {
    console.log('Using in-memory storage');
    return new InMemoryStorage();
  }
}

export const storage = createStorage();
