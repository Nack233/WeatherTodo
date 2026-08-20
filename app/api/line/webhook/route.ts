import { NextRequest, NextResponse } from 'next/server';
import { validateLineSignature } from '@/utils/line/line-client';
import { handleLineMessageEvent } from '@/utils/line/line-service';
import type { LineWebhookPayload } from '@/types/line';

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        message: 'Day Base LINE Webhook Endpoint is active',
        timestamp: new Date().toISOString(),
    });
}

export async function POST(req: NextRequest) {
    const channelSecret = (process.env.LINE_CHANNEL_SECRET || process.env.LINE_CHANNEL__SECRET)?.trim();

    try {
        const rawBody = await req.text();
        const signature = req.headers.get('x-line-signature');
        console.log('[LINE Webhook] Received request. Has signature:', Boolean(signature));

        // Verify LINE signature if channel secret is configured
        if (channelSecret) {
            const isValid = validateLineSignature(rawBody, signature, channelSecret);
            if (!isValid) {
                console.warn('[LINE Webhook] Invalid signature received. Check LINE_CHANNEL_SECRET');
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            }
        }

        let payload: LineWebhookPayload;
        try {
            payload = JSON.parse(rawBody);
        } catch {
            return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
        }

        const events = payload.events || [];
        console.log('[LINE Webhook] Event count:', events.length);

        // Process all webhook events concurrently
        const eventPromises = events.map(async event => {
            try {
                if (event.type === 'message' && event.message?.type === 'text') {
                    console.log('[LINE Webhook] Received message:', event.message.text);
                    await handleLineMessageEvent(event);
                }
            } catch (eventErr) {
                console.error('[LINE Webhook] Error processing single event:', eventErr);
            }
        });

        await Promise.all(eventPromises);

        return NextResponse.json({ status: 'success' }, { status: 200 });
    } catch (err) {
        console.error('[LINE Webhook] Unexpected error in POST handler:', err);
        // Always return 200 to LINE to prevent Webhook retries on internal errors
        return NextResponse.json({ status: 'internal_error' }, { status: 200 });
    }
}
