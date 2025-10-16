import { createClient, RedisClientType } from 'redis';
import { OptionOffer, ActiveOption, OrderbookEntry } from '../types.js';
import { Settlement } from '../storage.js';

export class RedisCache {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor(url?: string) {
    this.client = createClient({
      url: url || process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.client.on('error', (err) => console.error('Redis Client Error', err));
    this.client.on('connect', () => {
      this.isConnected = true;
      console.log('Redis connected');
    });
    this.client.on('disconnect', () => {
      this.isConnected = false;
      console.log('Redis disconnected');
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  // Offer caching
  async cacheOffer(offer: OptionOffer, ttl: number = 3600): Promise<void> {
    const key = `offer:${offer.offerHash}`;
    await this.client.setEx(key, ttl, JSON.stringify(offer));
  }

  async getCachedOffer(offerHash: string): Promise<OptionOffer | null> {
    const key = `offer:${offerHash}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async invalidateOffer(offerHash: string): Promise<void> {
    await this.client.del(`offer:${offerHash}`);
  }

  // Active option caching
  async cacheActiveOption(option: ActiveOption, ttl: number = 3600): Promise<void> {
    const key = `option:${option.tokenId}`;
    // Convert BigInt values to strings for JSON serialization
    const serializable = {
      ...option,
      tokenId: option.tokenId.toString(),
      strikePrice: option.strikePrice.toString(),
      startTime: option.startTime.toString(),
      expiryTime: option.expiryTime.toString(),
    };
    await this.client.setEx(key, ttl, JSON.stringify(serializable));
  }

  async getCachedActiveOption(tokenId: string): Promise<ActiveOption | null> {
    const key = `option:${tokenId}`;
    const data = await this.client.get(key);
    if (!data) return null;

    const parsed = JSON.parse(data);
    // Convert string values back to BigInt
    return {
      ...parsed,
      tokenId: BigInt(parsed.tokenId),
      strikePrice: BigInt(parsed.strikePrice),
      startTime: BigInt(parsed.startTime),
      expiryTime: BigInt(parsed.expiryTime),
    };
  }

  async invalidateActiveOption(tokenId: string): Promise<void> {
    await this.client.del(`option:${tokenId}`);
  }

  // Orderbook caching
  async cacheOrderbook(
    underlying: string,
    isCall: boolean | undefined,
    entries: OrderbookEntry[],
    ttl: number = 60
  ): Promise<void> {
    const key = `orderbook:${underlying}:${isCall ?? 'all'}`;
    await this.client.setEx(key, ttl, JSON.stringify(entries));
  }

  async getCachedOrderbook(
    underlying: string,
    isCall: boolean | undefined
  ): Promise<OrderbookEntry[] | null> {
    const key = `orderbook:${underlying}:${isCall ?? 'all'}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async invalidateOrderbook(underlying: string): Promise<void> {
    const keys = await this.client.keys(`orderbook:${underlying}:*`);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  // Settlement caching
  async cacheSettlement(settlement: Settlement, ttl: number = 3600): Promise<void> {
    const key = `settlement:${settlement.tokenId}`;
    await this.client.setEx(key, ttl, JSON.stringify(settlement));
  }

  async getCachedSettlement(tokenId: string): Promise<Settlement | null> {
    const key = `settlement:${tokenId}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async invalidateSettlement(tokenId: string): Promise<void> {
    await this.client.del(`settlement:${tokenId}`);
  }

  // Filled amount caching
  async cacheFilledAmount(offerHash: string, amount: string, ttl: number = 300): Promise<void> {
    const key = `filled:${offerHash}`;
    await this.client.setEx(key, ttl, amount);
  }

  async getCachedFilledAmount(offerHash: string): Promise<string | null> {
    const key = `filled:${offerHash}`;
    return await this.client.get(key);
  }

  async invalidateFilledAmount(offerHash: string): Promise<void> {
    await this.client.del(`filled:${offerHash}`);
  }

  // List caching (for getAllOffers, getAllSettlements, etc.)
  async cacheList(listKey: string, data: any[], ttl: number = 60): Promise<void> {
    await this.client.setEx(listKey, ttl, JSON.stringify(data));
  }

  async getCachedList<T>(listKey: string): Promise<T[] | null> {
    const data = await this.client.get(listKey);
    return data ? JSON.parse(data) : null;
  }

  async invalidateList(listKey: string): Promise<void> {
    await this.client.del(listKey);
  }

  // Pattern-based invalidation
  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  // Utility: Clear all cache
  async flushAll(): Promise<void> {
    await this.client.flushAll();
  }

  // Rate limiting helper
  async checkRateLimit(
    identifier: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = `ratelimit:${identifier}`;
    const current = await this.client.get(key);

    if (!current) {
      // First request in window
      await this.client.setEx(key, windowSeconds, '1');
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: Date.now() + windowSeconds * 1000,
      };
    }

    const count = parseInt(current, 10);
    if (count >= maxRequests) {
      const ttl = await this.client.ttl(key);
      return {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + ttl * 1000,
      };
    }

    await this.client.incr(key);
    const ttl = await this.client.ttl(key);
    return {
      allowed: true,
      remaining: maxRequests - count - 1,
      resetAt: Date.now() + ttl * 1000,
    };
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
let redisCache: RedisCache | null = null;

export function getRedisCache(): RedisCache {
  if (!redisCache) {
    redisCache = new RedisCache();
  }
  return redisCache;
}

export async function initRedisCache(): Promise<RedisCache> {
  const cache = getRedisCache();
  await cache.connect();
  return cache;
}
