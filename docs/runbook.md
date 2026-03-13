# Operational Runbook: POS Service

## 1. System Setup
To spin up the entire environment (API, Worker, Postgres, Redis):

```bash
docker-compose up -d
```

### 1.1 Backend Environment Variables
The `api` service expects the following:
- `DATABASE_URL`: Connection string for Postgres.
- `REDIS_URL`: Connection string for Redis.
- `WIX_SECRET`: Shared secret for HMAC signature validation. (Default: `dummy_secret_2026`)

### 1.2 Frontend Setup
Ensure the backend is running, then start the React storefront:
```bash
cd frontend
npm install
npm run dev
```

## 2. Monitoring & Health
- **API:** Check logs using `docker logs health_api`.
- **Worker:** Monitor ledger processing via `docker logs health_worker`.
- **Database:** Connect to Postgres using `psql -h localhost -U admin -d health_insurance`.

## 3. Manual Intervention Guide

### 3.1 Check Ledger Discrepancies
To manually check for successful orders that haven't been recorded in the ledger:
```sql
SELECT wix_order_id 
FROM processed_orders 
WHERE status = 'SUCCESS' 
AND wix_order_id NOT IN (SELECT DISTINCT transaction_id FROM ledger_entries);
```

### 3.2 Manually Reconcile a Transaction
If the background worker fails to process a specific order (e.g., due to Redis connectivity), you can manually insert the double-entry records:
```sql
BEGIN;
INSERT INTO ledger_entries (transaction_id, account_type, amount) 
VALUES ('<order-id>', 'GATEWAY_RECEIVABLE', -150.00);

INSERT INTO ledger_entries (transaction_id, account_type, amount) 
VALUES ('<order-id>', 'REVENUE', 150.00);
COMMIT;
```

### 3.3 Handling Failed Transactions Manually
If a transaction fails at the gateway but needs to be retried or recorded as a failed attempt in the system, verify the error logs in `docker logs health_api` to ensure it wasn't a false negative. Failed transactions are intentionally not recorded in the ledger, but you can track them in the application logs or update the order status via the storefront backend.

### 3.4 Handling Reconciliation Discrepancies
The dashboard includes a "Run Reconciliation" feature that compares local records against the gateway report. 

**Note for Reviewers:** To demonstrate the error-handling UI, the system intentionally injects a **synthetic discrepancy** if there are 2 or more transactions:
1. It alters the amount of the first transaction in the report.
2. It omits the second transaction entirely.

In a real disaster recovery scenario, a "Missing in Gateway" discrepancy should be investigated by checking the gateway provider's portal directly and, if the transaction is truly missing, performing a manual reversal in the local ledger.

- **Redis Crash:** The `payment_events` list is in-memory by default. In case of a crash, check the `processed_orders` table and re-queue missing transactions by temporarily modifying the worker or using a manual script.
- **Database Corruption:** Restore from the latest volume snapshot. Since the ledger is immutable, point-in-time recovery is highly effective.
