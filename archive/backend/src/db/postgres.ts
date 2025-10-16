import pg from 'pg';
import { OptionOffer, ActiveOption, OrderbookEntry } from '../types.js';
import { Settlement } from '../storage.js';

const { Pool } = pg;

export interface IStorage {
  // Offers
  addOffer(offer: OptionOffer): Promise<void>;
  getOffer(offerHash: string): Promise<OptionOffer | undefined>;
  getAllOffers(): Promise<OptionOffer[]>;
  getOffersByToken(underlying: string, isCall: boolean): Promise<OptionOffer[]>;
  deleteOffer(offerHash: string): Promise<void>;

  // Active Options
  addActiveOption(option: ActiveOption): Promise<void>;
  getActiveOption(tokenId: string): Promise<ActiveOption | undefined>;
  getActiveOptionsByTaker(taker: string): Promise<ActiveOption[]>;
  getActiveOptionsByWriter(writer: string): Promise<ActiveOption[]>;
  getActiveOptionsByOffer(offerHash: string): Promise<ActiveOption[]>;
  settleOption(tokenId: string): Promise<void>;

  // Filled Amounts
  updateFilledAmount(offerHash: string, amount: string): Promise<void>;
  getFilledAmount(offerHash: string): Promise<string>;

  // Orderbook
  getOrderbook(underlying: string, isCall?: boolean, filters?: {
    minDuration?: number;
    maxDuration?: number;
    minSize?: string;
  }): Promise<OrderbookEntry[]>;

  // Settlements
  addSettlement(settlement: Settlement): Promise<void>;
  getSettlement(tokenId: string): Promise<Settlement | undefined>;
  updateSettlement(tokenId: string, updates: Partial<Settlement>): Promise<void>;
  getAllSettlements(): Promise<Settlement[]>;

  // Utility
  clear(): Promise<void>;
}

export class PostgresStorage implements IStorage {
  private pool: pg.Pool;

  constructor(connectionString?: string) {
    this.pool = new Pool({
      connectionString: connectionString || process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async addOffer(offer: OptionOffer): Promise<void> {
    const query = `
      INSERT INTO offers (
        offer_hash, writer, underlying, collateral_amount, stablecoin,
        is_call, premium_per_day, min_duration, max_duration, min_fill_amount,
        deadline, config_hash, signature, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      ON CONFLICT (offer_hash) DO UPDATE SET
        writer = EXCLUDED.writer,
        underlying = EXCLUDED.underlying,
        collateral_amount = EXCLUDED.collateral_amount,
        stablecoin = EXCLUDED.stablecoin,
        is_call = EXCLUDED.is_call,
        premium_per_day = EXCLUDED.premium_per_day,
        min_duration = EXCLUDED.min_duration,
        max_duration = EXCLUDED.max_duration,
        min_fill_amount = EXCLUDED.min_fill_amount,
        deadline = EXCLUDED.deadline,
        config_hash = EXCLUDED.config_hash,
        signature = EXCLUDED.signature,
        updated_at = NOW()
    `;

    await this.pool.query(query, [
      offer.offerHash,
      offer.writer,
      offer.underlying,
      offer.collateralAmount,
      offer.stablecoin,
      offer.isCall,
      offer.premiumPerDay,
      offer.minDuration,
      offer.maxDuration,
      offer.minFillAmount,
      offer.deadline,
      offer.configHash,
      offer.signature || null,
    ]);
  }

  async getOffer(offerHash: string): Promise<OptionOffer | undefined> {
    const result = await this.pool.query(
      'SELECT * FROM offers WHERE offer_hash = $1',
      [offerHash]
    );

    if (result.rows.length === 0) return undefined;
    return this.rowToOffer(result.rows[0]);
  }

  async getAllOffers(): Promise<OptionOffer[]> {
    const result = await this.pool.query('SELECT * FROM offers ORDER BY created_at DESC');
    return result.rows.map(row => this.rowToOffer(row));
  }

  async getOffersByToken(underlying: string, isCall: boolean): Promise<OptionOffer[]> {
    const result = await this.pool.query(
      'SELECT * FROM offers WHERE LOWER(underlying) = LOWER($1) AND is_call = $2 ORDER BY created_at DESC',
      [underlying, isCall]
    );
    return result.rows.map(row => this.rowToOffer(row));
  }

  async deleteOffer(offerHash: string): Promise<void> {
    await this.pool.query('DELETE FROM offers WHERE offer_hash = $1', [offerHash]);
  }

  async addActiveOption(option: ActiveOption): Promise<void> {
    const query = `
      INSERT INTO active_options (
        token_id, writer, underlying, collateral_locked, is_call,
        strike_price, start_time, expiry_time, settled, config_hash, offer_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (token_id) DO UPDATE SET
        writer = EXCLUDED.writer,
        underlying = EXCLUDED.underlying,
        collateral_locked = EXCLUDED.collateral_locked,
        is_call = EXCLUDED.is_call,
        strike_price = EXCLUDED.strike_price,
        start_time = EXCLUDED.start_time,
        expiry_time = EXCLUDED.expiry_time,
        settled = EXCLUDED.settled,
        config_hash = EXCLUDED.config_hash,
        offer_hash = EXCLUDED.offer_hash,
        updated_at = NOW()
    `;

    await this.pool.query(query, [
      option.tokenId.toString(),
      option.writer,
      option.underlying,
      option.collateralLocked,
      option.isCall,
      option.strikePrice.toString(),
      option.startTime,
      option.expiryTime,
      option.settled,
      option.configHash,
      option.offerHash,
    ]);
  }

  async getActiveOption(tokenId: string): Promise<ActiveOption | undefined> {
    const result = await this.pool.query(
      'SELECT * FROM active_options WHERE token_id = $1',
      [tokenId]
    );

    if (result.rows.length === 0) return undefined;
    return this.rowToActiveOption(result.rows[0]);
  }

  async getActiveOptionsByTaker(taker: string): Promise<ActiveOption[]> {
    // Note: In the actual implementation, we'd need to track takers through NFT ownership
    // For now, this returns empty as we don't have taker stored directly
    // You might want to add a taker column or query the blockchain
    return [];
  }

  async getActiveOptionsByWriter(writer: string): Promise<ActiveOption[]> {
    const result = await this.pool.query(
      'SELECT * FROM active_options WHERE LOWER(writer) = LOWER($1) AND settled = false ORDER BY created_at DESC',
      [writer]
    );
    return result.rows.map(row => this.rowToActiveOption(row));
  }

  async getActiveOptionsByOffer(offerHash: string): Promise<ActiveOption[]> {
    const result = await this.pool.query(
      'SELECT * FROM active_options WHERE offer_hash = $1 AND settled = false ORDER BY created_at DESC',
      [offerHash]
    );
    return result.rows.map(row => this.rowToActiveOption(row));
  }

  async settleOption(tokenId: string): Promise<void> {
    await this.pool.query(
      'UPDATE active_options SET settled = true, updated_at = NOW() WHERE token_id = $1',
      [tokenId]
    );
  }

  async updateFilledAmount(offerHash: string, amount: string): Promise<void> {
    const query = `
      INSERT INTO filled_amounts (offer_hash, amount)
      VALUES ($1, $2)
      ON CONFLICT (offer_hash) DO UPDATE SET
        amount = (filled_amounts.amount::numeric + EXCLUDED.amount::numeric)::text,
        updated_at = NOW()
    `;
    await this.pool.query(query, [offerHash, amount]);
  }

  async getFilledAmount(offerHash: string): Promise<string> {
    const result = await this.pool.query(
      'SELECT amount FROM filled_amounts WHERE offer_hash = $1',
      [offerHash]
    );

    if (result.rows.length === 0) return '0';
    return result.rows[0].amount;
  }

  async getOrderbook(underlying: string, isCall?: boolean, filters?: {
    minDuration?: number;
    maxDuration?: number;
    minSize?: string;
  }): Promise<OrderbookEntry[]> {
    let query = `
      SELECT
        o.*,
        COALESCE(f.amount, '0') as filled_amount
      FROM offers o
      LEFT JOIN filled_amounts f ON o.offer_hash = f.offer_hash
      WHERE LOWER(o.underlying) = LOWER($1)
    `;

    const params: any[] = [underlying];
    let paramIndex = 2;

    if (isCall !== undefined) {
      query += ` AND o.is_call = $${paramIndex}`;
      params.push(isCall);
      paramIndex++;
    }

    if (filters?.minDuration !== undefined) {
      query += ` AND o.max_duration >= $${paramIndex}`;
      params.push(filters.minDuration);
      paramIndex++;
    }

    if (filters?.maxDuration !== undefined) {
      query += ` AND o.min_duration <= $${paramIndex}`;
      params.push(filters.maxDuration);
      paramIndex++;
    }

    const result = await this.pool.query(query, params);

    const entries: OrderbookEntry[] = result.rows
      .map(row => {
        const offer = this.rowToOffer(row);
        const filledAmount = row.filled_amount || '0';
        const remainingAmount = (BigInt(offer.collateralAmount) - BigInt(filledAmount)).toString();

        // Filter by min size
        if (filters?.minSize && BigInt(remainingAmount) < BigInt(filters.minSize)) {
          return null;
        }

        // Calculate total premium
        const totalPremium = (BigInt(offer.premiumPerDay) * BigInt(remainingAmount) / BigInt(offer.collateralAmount)).toString();

        return {
          ...offer,
          remainingAmount,
          filledAmount,
          totalPremium,
          isValid: BigInt(remainingAmount) > 0 && Number(offer.deadline) > Math.floor(Date.now() / 1000)
        };
      })
      .filter(entry => entry !== null && entry.isValid) as OrderbookEntry[];

    // Sort by totalPremium ascending
    return entries.sort((a, b) => {
      const diff = BigInt(a.totalPremium) - BigInt(b.totalPremium);
      return diff > 0n ? 1 : diff < 0n ? -1 : 0;
    });
  }

  async addSettlement(settlement: Settlement): Promise<void> {
    const query = `
      INSERT INTO settlements (
        token_id, "order", order_hash, settlement_conditions_hash,
        eip1271_signature, order_uid, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, to_timestamp($8 / 1000.0))
      ON CONFLICT (token_id) DO UPDATE SET
        "order" = EXCLUDED."order",
        order_hash = EXCLUDED.order_hash,
        settlement_conditions_hash = EXCLUDED.settlement_conditions_hash,
        eip1271_signature = EXCLUDED.eip1271_signature,
        order_uid = EXCLUDED.order_uid,
        status = EXCLUDED.status,
        updated_at = NOW()
    `;

    await this.pool.query(query, [
      settlement.tokenId,
      JSON.stringify(settlement.order),
      settlement.orderHash,
      settlement.settlementConditionsHash,
      settlement.eip1271Signature || null,
      settlement.orderUid || null,
      settlement.status,
      settlement.createdAt,
    ]);
  }

  async getSettlement(tokenId: string): Promise<Settlement | undefined> {
    const result = await this.pool.query(
      'SELECT * FROM settlements WHERE token_id = $1',
      [tokenId]
    );

    if (result.rows.length === 0) return undefined;
    return this.rowToSettlement(result.rows[0]);
  }

  async updateSettlement(tokenId: string, updates: Partial<Settlement>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.order !== undefined) {
      fields.push(`"order" = $${paramIndex}`);
      values.push(JSON.stringify(updates.order));
      paramIndex++;
    }

    if (updates.orderHash !== undefined) {
      fields.push(`order_hash = $${paramIndex}`);
      values.push(updates.orderHash);
      paramIndex++;
    }

    if (updates.settlementConditionsHash !== undefined) {
      fields.push(`settlement_conditions_hash = $${paramIndex}`);
      values.push(updates.settlementConditionsHash);
      paramIndex++;
    }

    if (updates.eip1271Signature !== undefined) {
      fields.push(`eip1271_signature = $${paramIndex}`);
      values.push(updates.eip1271Signature);
      paramIndex++;
    }

    if (updates.orderUid !== undefined) {
      fields.push(`order_uid = $${paramIndex}`);
      values.push(updates.orderUid);
      paramIndex++;
    }

    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex}`);
      values.push(updates.status);
      paramIndex++;
    }

    if (fields.length === 0) return;

    fields.push('updated_at = NOW()');
    values.push(tokenId);

    const query = `UPDATE settlements SET ${fields.join(', ')} WHERE token_id = $${paramIndex}`;
    await this.pool.query(query, values);
  }

  async getAllSettlements(): Promise<Settlement[]> {
    const result = await this.pool.query('SELECT * FROM settlements ORDER BY created_at DESC');
    return result.rows.map(row => this.rowToSettlement(row));
  }

  async clear(): Promise<void> {
    await this.pool.query('TRUNCATE TABLE offers, active_options, filled_amounts, settlements CASCADE');
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  // Helper methods to convert DB rows to objects
  private rowToOffer(row: any): OptionOffer {
    return {
      offerHash: row.offer_hash,
      writer: row.writer,
      underlying: row.underlying,
      collateralAmount: row.collateral_amount,
      stablecoin: row.stablecoin,
      isCall: row.is_call,
      premiumPerDay: row.premium_per_day,
      minDuration: row.min_duration,
      maxDuration: row.max_duration,
      minFillAmount: row.min_fill_amount,
      deadline: row.deadline,
      configHash: row.config_hash,
      signature: row.signature,
    };
  }

  private rowToActiveOption(row: any): ActiveOption {
    return {
      tokenId: BigInt(row.token_id),
      writer: row.writer,
      underlying: row.underlying,
      collateralLocked: row.collateral_locked,
      isCall: row.is_call,
      strikePrice: BigInt(row.strike_price),
      startTime: BigInt(row.start_time),
      expiryTime: BigInt(row.expiry_time),
      settled: row.settled,
      configHash: row.config_hash,
      offerHash: row.offer_hash,
    };
  }

  private rowToSettlement(row: any): Settlement {
    return {
      tokenId: row.token_id,
      order: typeof row.order === 'string' ? JSON.parse(row.order) : row.order,
      orderHash: row.order_hash,
      settlementConditionsHash: row.settlement_conditions_hash,
      eip1271Signature: row.eip1271_signature,
      orderUid: row.order_uid,
      status: row.status,
      createdAt: new Date(row.created_at).getTime(),
    };
  }
}
