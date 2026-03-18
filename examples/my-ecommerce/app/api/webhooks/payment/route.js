"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const core_1 = require("@bizup-pay/core");
require("@bizup-pay/morning");
require("@bizup-pay/cardcom");
async function POST(request) {
    try {
        const body = await request.json();
        // In a real app, you'd determine the provider from the webhook URL path
        // or from a stored session. Here we try both providers.
        const providerName = (body._provider || 'morning');
        const config = providerName === 'morning'
            ? {
                apiKey: process.env.MORNING_API_KEY || 'demo-key',
                apiSecret: process.env.MORNING_API_SECRET || 'demo-secret',
            }
            : {
                terminalNumber: Number(process.env.CARDCOM_TERMINAL_NUMBER) || 1000,
                apiName: process.env.CARDCOM_API_NAME || 'demo',
                apiPassword: process.env.CARDCOM_API_PASSWORD || 'demo',
            };
        const provider = (0, core_1.createProvider)(providerName, config);
        const event = await provider.parseWebhook(body);
        console.log(`[webhook] ${event.type}`, {
            transactionId: event.transaction.id,
            amount: event.transaction.amount,
            status: event.transaction.status,
            provider: event.transaction.provider,
        });
        // In a real app, you would:
        // 1. Update order status in your database
        // 2. Send confirmation email
        // 3. Trigger fulfillment
        return server_1.NextResponse.json({ received: true });
    }
    catch (err) {
        console.error('Webhook error:', err);
        return server_1.NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map