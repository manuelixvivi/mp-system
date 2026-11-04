import { NextRequest, NextResponse } from 'next/server';
import {
  getAutomationSettings,
  updateAutomationSettings,
  getProfileByEmail,
  addActivityLog,
} from '@/lib/db/store';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getAuthorizedSuperadmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const sessionUser = await verifySessionToken(token);
  if (!sessionUser?.email) return null;
  const dbUser = await getProfileByEmail(sessionUser.email);
  if (!dbUser || !dbUser.is_active || dbUser.role !== 'superadmin') return null;
  return dbUser;
}

export async function GET() {
  const settings = await getAutomationSettings();
  return NextResponse.json(
    { settings },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    }
  );
}

export async function PUT(req: NextRequest) {
  const superadmin = await getAuthorizedSuperadmin(req);
  if (!superadmin) {
    return NextResponse.json(
      { error: 'Akses ditolak: Hanya Superadmin yang berwenang mengubah pengaturan otomatisasi.' },
      {
        status: 403,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        },
      }
    );
  }

  try {
    const body = await req.json();
    const updated = await updateAutomationSettings(body);

    addActivityLog({
      user_id: superadmin.id,
      user_name: superadmin.name,
      actor_type: 'user',
      action: 'settings_updated',
      entity_type: 'settings',
      details: { updates: body },
    });

    return NextResponse.json(
      { success: true, settings: updated },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        },
      }
    );
  }
}
