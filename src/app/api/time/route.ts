import { NextResponse } from 'next/server';
import { getWibParts } from '@/lib/time';

export const dynamic = 'force-dynamic';

export async function GET() {
  const serverNow = new Date();
  const timestamp = serverNow.getTime();
  const wib = getWibParts(serverNow);

  return NextResponse.json(
    {
      timestamp,
      utc_iso: serverNow.toISOString(),
      wib,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}
