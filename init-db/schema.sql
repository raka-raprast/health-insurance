-- Enable UUID support for the ledger [cite: 63]
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Idempotency Table [cite: 43, 44]
CREATE TABLE processed_orders (
    wix_order_id VARCHAR(255) PRIMARY KEY, -- Ensures we don't process same ID twice
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. The Double-Entry Ledger [cite: 58, 62]
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- e.g., 'GATEWAY_RECEIVABLE', 'REVENUE' [cite: 65]
    amount DECIMAL(19, 4) NOT NULL,    -- Positive for Credit, Negative for Debit [cite: 68]
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP -- [cite: 71]
);

-- Index for the Back-Office Audit View [cite: 76]
CREATE INDEX idx_ledger_transaction ON ledger_entries(transaction_id);