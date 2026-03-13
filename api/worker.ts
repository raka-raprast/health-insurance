import { Pool } from 'pg';
import Redis from 'ioredis';

if (!process.env.DATABASE_URL || !process.env.REDIS_URL) {
    throw new Error('DATABASE_URL and REDIS_URL environment variables must be set');
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = new Redis(process.env.REDIS_URL);

interface PaymentEvent {
    orderId: string;
    amount: number;
    currency: string;
    fee: number;
    type: string;
    timestamp: Date;
    settlementAmount?: number;
}

async function processLedger() {
    console.log("Worker started: Waiting for payment events...");

    while (true) {
        try {
            // 'BRPOP' waits for a new message in the 'payment_events' list
            const result = await redis.brpop('payment_events', 0);
            if (!result) {
                continue;
            }
            
            const data = result[1];
            const event: PaymentEvent = JSON.parse(data);

            // Start a SQL Transaction to ensure both entries happen together
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                if (event.type === 'PAYMENT_SUCCESS') {
                    // 1. Debit the Gateway (Negative - what we actually receive: amount - fee)
                    const fee = event.fee || 0;
                    const currency = event.currency || 'USD';
                    await client.query(
                        'INSERT INTO ledger_entries (transaction_id, account_type, amount, currency) VALUES ($1, $2, $3, $4)',
                        [event.orderId, 'GATEWAY_RECEIVABLE', -(event.amount - fee), currency]
                    );

                    // 2. Debit the Gateway Fee (Negative)
                    if (fee > 0) {
                        await client.query(
                            'INSERT INTO ledger_entries (transaction_id, account_type, amount, currency) VALUES ($1, $2, $3, $4)',
                            [event.orderId, 'GATEWAY_FEE', -fee, currency]
                        );
                    }

                    // 3. Credit Revenue (Positive)
                    await client.query(
                        'INSERT INTO ledger_entries (transaction_id, account_type, amount, currency) VALUES ($1, $2, $3, $4)',
                        [event.orderId, 'REVENUE', event.amount, currency]
                    );
                } else if (event.type === 'SETTLEMENT_SUCCESS') {
                    const currency = event.currency || 'USD';
                    const amountToSettle = event.settlementAmount || 0;
                    
                    if (amountToSettle > 0) {
                        // 1. Credit the Gateway Receivable (Positive) to reduce its negative balance
                        await client.query(
                            'INSERT INTO ledger_entries (transaction_id, account_type, amount, currency) VALUES ($1, $2, $3, $4)',
                            [event.orderId, 'GATEWAY_RECEIVABLE', amountToSettle, currency]
                        );

                        // 2. Debit the Bank Account (Negative)
                        await client.query(
                            'INSERT INTO ledger_entries (transaction_id, account_type, amount, currency) VALUES ($1, $2, $3, $4)',
                            [event.orderId, 'CHASE_BANK_ACCOUNT', -amountToSettle, currency]
                        );
                    }
                }

                await client.query('COMMIT');
                
                // CONSULTANT POLISH: Verify zero-sum integrity immediately
                const check = await client.query(
                    'SELECT SUM(amount) as balance FROM ledger_entries WHERE transaction_id = $1',
                    [event.orderId]
                );
                console.log(`Ledger updated for order: ${event.orderId} (${event.type}). Integrity Check: Balance = ${check.rows[0].balance}`);
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
        } catch (err) {
            console.error("Worker Error - Could not update ledger:", err);
            // In a real system, you'd put the message back in a "Dead Letter Queue"
        }
    }
}

processLedger();
