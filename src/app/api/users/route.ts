import { NextRequest, NextResponse } from 'next/server';
import { getProfiles, createProfile, addActivityLog } from '@/lib/db/store';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Check authorization
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (!user || user.role !== 'superadmin') {
    return NextResponse.json(
      { error: 'Akses ditolak: Hanya Superadmin yang berhak melihat daftar akun.' },
      { status: 403 }
    );
  }

  // Returns safe profiles with password_hash strictly omitted
  const users = getProfiles();
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (!user || user.role !== 'superadmin') {
    return NextResponse.json(
      { error: 'Akses ditolak: Hanya Superadmin yang berhak membuat akun baru.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { name, email, role, line_user_id, password } = body;

    if (!name || !email || !role || !password) {
      return NextResponse.json(
        { error: 'Nama, email, role, dan password wajib diisi.' },
        { status: 400 }
      );
    }

    // Creates profile with bcrypt hashed password
    const newProfile = createProfile(
      {
        name,
        email,
        role,
        line_user_id,
        is_active: true,
      },
      password
    );

    addActivityLog({
      user_id: user.id,
      user_name: user.name,
      actor_type: 'user',
      action: 'user_account_created',
      entity_type: 'profile',
      entity_id: newProfile.id,
      details: { email: newProfile.email, role: newProfile.role },
    });

    return NextResponse.json({ success: true, user: newProfile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
