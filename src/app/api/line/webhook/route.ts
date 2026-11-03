import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { handleLineWebhookEvent } from '@/lib/line/bot-handler';
import { getLineBotSync } from '@/lib/db/store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-line-signature');
    const bot = getLineBotSync();
    const channelSecret = process.env.LINE_CHANNEL_SECRET || bot?.channel_secret || '';

    // Verify signature if signature header and secret are present
    if (signature && channelSecret) {
      const hash = crypto
        .createHmac('SHA256', channelSecret)
        .update(rawBody)
        .digest('base64');

      if (hash !== signature) {
        console.warn('[LINE WEBHOOK] Invalid signature detected');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody || '{}');
    const events = payload.events || [];

    const results = [];
    for (const event of events) {
      const res = await handleLineWebhookEvent(event);
      results.push(res);
    }

    return NextResponse.json({ status: 'ok', processed: results.length });
  } catch (err: any) {
    console.error('[LINE WEBHOOK ERROR]', err);
    return NextResponse.json({ error: err.message || 'Webhook processing failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    service: 'MP Control System LINE Webhook Gateway',
    timestamp: new Date().toISOString(),
  });
}
