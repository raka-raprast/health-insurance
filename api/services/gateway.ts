/**
 * Mock Gateway Service
 * Simulates 3rd party provider behavior 
 */
interface PaymentData {
    simulationMode?: 'FORCE_FAIL' | 'FORCE_SUCCESS';
    order: {
        amount: number;
    };
}

interface GatewayResult {
    success: boolean;
    status: 'DECLINED' | 'SUCCESS';
    error?: string;
    transactionId?: string;
    fee?: number;
}

export const processPayment = async (paymentData: PaymentData): Promise<GatewayResult> => {
    // 1. Forced Latency: 2000ms to 5000ms 
    const latency = Math.floor(Math.random() * (5000 - 2000 + 1)) + 2000;
    await new Promise(resolve => setTimeout(resolve, latency));

    let isFailure = false;

    if (paymentData.simulationMode === 'FORCE_FAIL') {
        isFailure = true;
    } else if (paymentData.simulationMode === 'FORCE_SUCCESS') {
        isFailure = false;
    } else {
        // 2. Random Failure Rate: 10% 
        isFailure = Math.random() < 0.10;
    }

    if (isFailure) {
        return {
            success: false,
            status: 'DECLINED',
            error: 'Gateway connection timeout or insufficient funds'
        };
    }

    // Use integer-based currency handling (calculate in cents to avoid floating-point errors)
    const amountCents = Math.round(paymentData.order.amount * 100);
    const feeCents = Math.round((amountCents * 29) / 1000) + 30; // 2.9% + $0.30
    const fee = feeCents / 100;

    return {
        success: true,
        status: 'SUCCESS',
        transactionId: `gtw_${Math.random().toString(36).substr(2, 9)}`,
        fee: fee
    };
};
