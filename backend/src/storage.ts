import { OptionOffer, ActiveOption, OrderbookEntry } from './types.js';

/**
 * In-memory storage for MVP
 * TODO: Migrate to PostgreSQL or GunDB later
 */
class InMemoryStorage {
  private offers: Map<string, OptionOffer> = new Map();
  private activeOptions: Map<string, ActiveOption> = new Map();
  private filledAmounts: Map<string, string> = new Map();

  // Offers
  addOffer(offer: OptionOffer): void {
    this.offers.set(offer.offerHash, offer);
  }

  getOffer(offerHash: string): OptionOffer | undefined {
    return this.offers.get(offerHash);
  }

  getAllOffers(): OptionOffer[] {
    return Array.from(this.offers.values());
  }

  getOffersByToken(underlying: string, isCall: boolean): OptionOffer[] {
    return Array.from(this.offers.values()).filter(
      (offer) => offer.underlying.toLowerCase() === underlying.toLowerCase() && offer.isCall === isCall
    );
  }

  deleteOffer(offerHash: string): void {
    this.offers.delete(offerHash);
  }

  // Active Options
  addActiveOption(option: ActiveOption): void {
    this.activeOptions.set(option.tokenId, option);
  }

  getActiveOption(tokenId: string): ActiveOption | undefined {
    return this.activeOptions.get(tokenId);
  }

  getActiveOptionsByTaker(taker: string): ActiveOption[] {
    return Array.from(this.activeOptions.values()).filter(
      (option) => option.taker.toLowerCase() === taker.toLowerCase() && !option.settled
    );
  }

  getActiveOptionsByWriter(writer: string): ActiveOption[] {
    return Array.from(this.activeOptions.values()).filter(
      (option) => option.writer.toLowerCase() === writer.toLowerCase() && !option.settled
    );
  }

  getActiveOptionsByOffer(offerHash: string): ActiveOption[] {
    return Array.from(this.activeOptions.values()).filter(
      (option) => option.offerHash === offerHash && !option.settled
    );
  }

  settleOption(tokenId: string): void {
    const option = this.activeOptions.get(tokenId);
    if (option) {
      option.settled = true;
      this.activeOptions.set(tokenId, option);
    }
  }

  // Filled Amounts
  updateFilledAmount(offerHash: string, amount: string): void {
    const current = this.filledAmounts.get(offerHash) || '0';
    const newAmount = (BigInt(current) + BigInt(amount)).toString();
    this.filledAmounts.set(offerHash, newAmount);
  }

  getFilledAmount(offerHash: string): string {
    return this.filledAmounts.get(offerHash) || '0';
  }

  // Orderbook utilities
  getOrderbook(underlying: string, isCall?: boolean, filters?: {
    minDuration?: number;
    maxDuration?: number;
    minSize?: string;
  }): OrderbookEntry[] {
    let offers = isCall !== undefined
      ? this.getOffersByToken(underlying, isCall)
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
    const entries: OrderbookEntry[] = offers.map(offer => {
      const filledAmount = this.getFilledAmount(offer.offerHash);
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
    }).filter(entry => entry !== null) as OrderbookEntry[];

    // Sort by totalPremium (price × size) ascending
    return entries
      .filter(e => e.isValid)
      .sort((a, b) => {
        const diff = BigInt(a.totalPremium) - BigInt(b.totalPremium);
        return diff > 0n ? 1 : diff < 0n ? -1 : 0;
      });
  }

  // Clear all data (for testing)
  clear(): void {
    this.offers.clear();
    this.activeOptions.clear();
    this.filledAmounts.clear();
  }
}

export const storage = new InMemoryStorage();
