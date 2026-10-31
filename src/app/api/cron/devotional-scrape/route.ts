import { NextRequest, NextResponse } from 'next/server';
import { runDevotionalScrapeJob } from '@/lib/scheduler/runner';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const isVercelCron = req.headers.get('x-vercel-cron') === '1';
    const secret = process.env.CRON_SECRET || 'mp_control_secret_dev';

    // Allow if verified by Vercel native cron header or bearer token
    if (process.env.NODE_ENV === 'production') {
      const isBearerValid = authHeader === `Bearer ${secret}`;
      if (!isVercelCron && !isBearerValid) {
        return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
      }
    }

    const result = await runDevotionalScrapeJob();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
