"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const core_1 = require("@bizup-pay/core");
require("@bizup-pay/morning");
require("@bizup-pay/cardcom");
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
function getProviderConfig(provider) {
    switch (provider) {
        case 'morning':
            return {
                apiKey: process.env.MORNING_API_KEY || 'demo-key',
                apiSecret: process.env.MORNING_API_SECRET || 'demo-secret',
            };
        case 'cardcom':
            return {
                terminalNumber: Number(process.env.CARDCOM_TERMINAL_NUMBER) || 1000,
                apiName: process.env.CARDCOM_API_NAME || 'demo',
                apiPassword: process.env.CARDCOM_API_PASSWORD || 'demo',
            };
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}
async function POST(request) {
    try {
        const body = await request.json();
        const { provider: providerName, items } = body;
        if (!providerName || !items?.length) {
            return server_1.NextResponse.json({ error: 'Missing provider or items' }, { status: 400 });
        }
        const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const description = items.map((i) => `${i.name} x${i.quantity}`).join(', ');
        const provider = (0, core_1.createProvider)(providerName, getProviderConfig(providerName));
        const session = await provider.createSession({
            amount: total,
            currency: 'ILS',
            description,
            customer: {
                name: 'Demo Customer',
                email: 'demo@example.com',
            },
            successUrl: `${APP_URL}/success`,
            failureUrl: `${APP_URL}/failure`,
            webhookUrl: `${APP_URL}/api/webhooks/payment`,
            metadata: {
                items: JSON.stringify(items),
            },
        });
        return server_1.NextResponse.json(session);
    }
    catch (err) {
        console.error('Checkout error:', err);
        return server_1.NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
    }
}
//# sourceMappingURL=route.js.map