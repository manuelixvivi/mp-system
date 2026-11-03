import { NextRequest, NextResponse } from 'next/server';
import { getDevotionals, getDevotionalByDate, saveDevotional, getProfileByEmail, addActivityLog } from '@/lib/db/store';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    if (date) {
      const devotional = await getDevotionalByDate(date);
      return NextResponse.json({ devotional: devotional || null });
    }

    const devotionals = await getDevotionals();
    return NextResponse.json({ devotionals: devotionals || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const sessionUser = token ? await verifySessionToken(token) : null;
    if (!sessionUser?.email) {
      return NextResponse.json({ error: 'Akses ditolak: Anda belum terautentikasi.' }, { status: 401 });
    }

    const user = await getProfileByEmail(sessionUser.email);
    if (!user || !user.is_active || (user.role !== 'superadmin' && user.role !== 'liturgi')) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Tim Liturgi dan Superadmin yang dapat menyimpan renungan.' }, { status: 403 });
    }

    const body = await req.json();
    const saved = await saveDevotional(body);

    addActivityLog({
      user_id: user.id,
      user_name: user.name,
      actor_type: 'user',
      action: 'devotional_created',
      entity_type: 'devotional',
      entity_id: saved.id,
      details: { verse_reference: saved.verse_reference, devotional_date: saved.devotional_date },
    });

    return NextResponse.json({ success: true, devotional: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
