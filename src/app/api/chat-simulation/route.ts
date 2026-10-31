import { NextRequest, NextResponse } from 'next/server';
import { handleLineWebhookEvent } from '@/lib/line/bot-handler';

export async function POST(req: NextRequest) {
  try {
    const { userId, text } = await req.json();

    if (!userId || !text) {
      return NextResponse.json({ error: 'userId and text are required' }, { status: 400 });
    }

    // Mock incoming LINE Webhook Event
    const event = {
      type: 'message',
      replyToken: `sim_token_${Date.now()}`,
      source: {
        type: 'user',
        userId: userId,
      },
      message: {
        id: `sim_msg_${Date.now()}`,
        type: 'text',
        text: text,
      },
      timestamp: Date.now(),
    };

    const result = await handleLineWebhookEvent(event);

    return NextResponse.json({
      success: true,
      botReply: result?.text || (result?.status === 'unauthorized' ? 'Akses Ditolak: Akun belum terdaftar.' : 'Pesan diproses.'),
      rawResult: result,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
