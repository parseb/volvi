-- Options Protocol Database Schema
-- Initialize database with required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Signed Orders/Offers Table
CREATE TABLE IF NOT EXISTS offers (
    offer_hash VARCHAR(66) PRIMARY KEY,
    writer_address VARCHAR(42) NOT NULL,
    underlying_address VARCHAR(42) NOT NULL,
    collateral_amount NUMERIC(78, 0) NOT NULL,
    stablecoin_address VARCHAR(42) NOT NULL,
    is_call BOOLEAN NOT NULL,
    premium_per_day NUMERIC(78, 0) NOT NULL,
    min_duration INTEGER NOT NULL,
    max_duration INTEGER NOT NULL,
    min_fill_amount NUMERIC(78, 0) NOT NULL,
    deadline BIGINT NOT NULL,
    config_hash VARCHAR(66) NOT NULL,
    signature TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    cancelled_at TIMESTAMP NULL,
    expires_at TIMESTAMP NOT NULL,
    CONSTRAINT positive_collateral CHECK (collateral_amount > 0),
    CONSTRAINT positive_premium CHECK (premium_per_day > 0),
    CONSTRAINT valid_duration CHECK (min_duration <= max_duration)
);

-- Indexes for offers
CREATE INDEX IF NOT EXISTS idx_offers_underlying ON offers(underlying_address);
CREATE INDEX IF NOT EXISTS idx_offers_writer ON offers(writer_address);
CREATE INDEX IF NOT EXISTS idx_offers_is_call ON offers(is_call);
CREATE INDEX IF NOT EXISTS idx_offers_expires_at ON offers(expires_at);
CREATE INDEX IF NOT EXISTS idx_offers_cancelled ON offers(cancelled_at) WHERE cancelled_at IS NOT NULL;

-- Active Options Table
CREATE TABLE IF NOT EXISTS active_options (
    token_id VARCHAR(78) PRIMARY KEY,
    offer_hash VARCHAR(66) NOT NULL REFERENCES offers(offer_hash),
    writer_address VARCHAR(42) NOT NULL,
    taker_address VARCHAR(42) NOT NULL,
    underlying_address VARCHAR(42) NOT NULL,
    collateral_locked NUMERIC(78, 0) NOT NULL,
    is_call BOOLEAN NOT NULL,
    strike_price NUMERIC(78, 0) NOT NULL,
    start_time BIGINT NOT NULL,
    expiry_time BIGINT NOT NULL,
    settled BOOLEAN DEFAULT FALSE,
    config_hash VARCHAR(66) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    settled_at TIMESTAMP NULL,
    CONSTRAINT positive_strike CHECK (strike_price > 0),
    CONSTRAINT valid_expiry CHECK (expiry_time > start_time)
);

-- Indexes for active_options
CREATE INDEX IF NOT EXISTS idx_active_options_taker ON active_options(taker_address);
CREATE INDEX IF NOT EXISTS idx_active_options_writer ON active_options(writer_address);
CREATE INDEX IF NOT EXISTS idx_active_options_expiry ON active_options(expiry_time);
CREATE INDEX IF NOT EXISTS idx_active_options_settled ON active_options(settled);
CREATE INDEX IF NOT EXISTS idx_active_options_offer ON active_options(offer_hash);

-- Filled Amounts Table
CREATE TABLE IF NOT EXISTS filled_amounts (
    offer_hash VARCHAR(66) PRIMARY KEY REFERENCES offers(offer_hash),
    filled_amount NUMERIC(78, 0) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT non_negative_filled CHECK (filled_amount >= 0)
);

-- Settlements Table (CoW Protocol)
CREATE TABLE IF NOT EXISTS settlements (
    token_id VARCHAR(78) PRIMARY KEY REFERENCES active_options(token_id),
    order_hash VARCHAR(66) NOT NULL,
    cow_order JSONB NOT NULL,
    settlement_conditions_hash VARCHAR(66) NOT NULL,
    taker_signature TEXT NULL,
    eip1271_signature TEXT NULL,
    order_uid VARCHAR(114) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'initiated',
    min_buy_amount NUMERIC(78, 0) NOT NULL,
    valid_to BIGINT NOT NULL,
    app_data VARCHAR(66) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_status CHECK (status IN ('initiated', 'approved', 'submitted', 'completed', 'failed'))
);

-- Indexes for settlements
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);
CREATE INDEX IF NOT EXISTS idx_settlements_order_uid ON settlements(order_uid);
CREATE INDEX IF NOT EXISTS idx_settlements_order_hash ON settlements(order_hash);

-- Transaction Logs Table (Audit Trail)
CREATE TABLE IF NOT EXISTS transaction_logs (
    id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(66) NULL,
    event_type VARCHAR(50) NOT NULL,
    related_id VARCHAR(78) NOT NULL,
    data JSONB NOT NULL,
    block_number BIGINT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for transaction_logs
CREATE INDEX IF NOT EXISTS idx_transaction_logs_event_type ON transaction_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_related_id ON transaction_logs(related_id);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_block_number ON transaction_logs(block_number);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_created_at ON transaction_logs(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for settlements updated_at
CREATE TRIGGER update_settlements_updated_at
    BEFORE UPDATE ON settlements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for filled_amounts updated_at
CREATE TRIGGER update_filled_amounts_updated_at
    BEFORE UPDATE ON filled_amounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO protocol_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO protocol_user;

-- Insert initial test data (optional - for development)
-- Uncomment for development environment
-- INSERT INTO offers VALUES (
--     '0x0000000000000000000000000000000000000000000000000000000000000001',
--     '0x0000000000000000000000000000000000000001',
--     '0x4200000000000000000000000000000000000006',
--     '1000000000000000000',
--     '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
--     true,
--     '10000000',
--     7,
--     365,
--     '100000000000000000',
--     EXTRACT(EPOCH FROM NOW() + INTERVAL '30 days')::BIGINT,
--     '0x0000000000000000000000000000000000000000000000000000000000000000',
--     '0x00',
--     NOW(),
--     NULL,
--     NOW() + INTERVAL '30 days'
-- ) ON CONFLICT DO NOTHING;

COMMIT;
