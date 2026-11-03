import { NextRequest, NextResponse } from 'next/server';
import { runDevotionalScrapeJob } from '@/lib/scheduler/runner';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth/session';
import { getProfileByEmail } from '@/lib/db/store';

export const dynamic = 'force-dynamic';

async function isAuthorizedCronRequest(req: NextRequest): Promise<boolean> {
  // 1. Native Vercel Cron Header
  if (req.headers.get('x-vercel-cron') === '1') {
    return true;
  }

  // 2. Bearer token in Authorization header or query parameter ?secret=
  const authHeader = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET || 'mp_control_secret_dev';
  if (authHeader === `Bearer ${secret}`) {
    return true;
  }

  const { searchParams } = new URL(req.url);
  if (searchParams.get('secret') === secret) {
    return true;
  }

  // 3. Authenticated session from logged-in user on Dashboard
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (token) {
      const sessionUser = await verifySessionToken(token);
      if (sessionUser?.email) {
        const user = await getProfileByEmail(sessionUser.email);
        if (user && user.is_active && (user.role === 'superadmin' || user.role === 'liturgi')) {
          return true;
        }
      }
    }
  } catch (err) {
    console.warn('[CRON AUTH] Cookie verification warning:', err);
  }

  // 4. Always allowed in development environment
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    const authorized = await isAuthorizedCronRequest(req);
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
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
