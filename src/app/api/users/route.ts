import { NextRequest, NextResponse } from 'next/server';
import {
  getProfiles,
  createProfile,
  deleteProfile,
  getProfileByEmail,
  regenerateProfileToken,
  addActivityLog,
} from '@/lib/db/store';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

async function getAuthenticatedSuperadmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const sessionUser = await verifySessionToken(token);
  if (!sessionUser || !sessionUser.email) return null;

  // Confirm directly against database profile
  const dbUser = await getProfileByEmail(sessionUser.email);
  if (!dbUser || !dbUser.is_active || dbUser.role !== 'superadmin') {
    return null;
  }

  return dbUser;
}

export async function GET(req: NextRequest) {
  const superadmin = await getAuthenticatedSuperadmin(req);
  if (!superadmin) {
    return NextResponse.json(
      { error: 'Akses ditolak: Hanya Superadmin yang berhak melihat daftar akun.' },
      { status: 403 }
    );
  }

  // Returns safe profiles live from Supabase
  const users = await getProfiles();
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const superadmin = await getAuthenticatedSuperadmin(req);
  if (!superadmin) {
    return NextResponse.json(
      { error: 'Akses ditolak: Hanya Superadmin yang berhak mendaftarkan akun baru.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { name, email, role, line_user_id, password, registration_token } = body;

    if (!name || !email || !role || !password) {
      return NextResponse.json(
        { error: 'Nama lengkap, email, role, dan password wajib diisi.' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+$/.test(trimmedEmail)) {
      return NextResponse.json(
        { error: 'Format email tidak valid.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password harus minimal 6 karakter demi keamanan sistem.' },
        { status: 400 }
      );
    }

    const validRoles = ['superadmin', 'liturgi', 'logistik'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Role yang dipilih tidak valid.' },
        { status: 400 }
      );
    }

    // Creates profile with bcrypt hashed password and one-time LINE activation token
    const newProfile = await createProfile(
      {
        name: name.trim(),
        email: trimmedEmail,
        role,
        line_user_id: line_user_id?.trim() || undefined,
        registration_token: registration_token ? registration_token.trim().toUpperCase() : undefined,
        is_active: Boolean(line_user_id?.trim()),
      },
      password
    );

    addActivityLog({
      user_id: superadmin.id,
      user_name: superadmin.name,
      actor_type: 'user',
      action: 'user_account_created',
      entity_type: 'profile',
      entity_id: newProfile.id,
      details: {
        created_user_email: newProfile.email,
        assigned_role: newProfile.role,
        registration_token: newProfile.registration_token,
        creator: superadmin.email,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Akun ${newProfile.name} (${newProfile.role}) berhasil didaftarkan. Token aktivasi LINE: ${newProfile.registration_token || 'Langsung Terhubung'}.`,
      user: newProfile,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal membuat akun.' }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const superadmin = await getAuthenticatedSuperadmin(req);
  if (!superadmin) {
    return NextResponse.json(
      { error: 'Akses ditolak: Hanya Superadmin yang berhak memperbarui token.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { userId, action } = body;

    if (action === 'regenerate_token' && userId) {
      const newToken = await regenerateProfileToken(userId);
      if (!newToken) {
        return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 });
      }

      addActivityLog({
        user_id: superadmin.id,
        user_name: superadmin.name,
        actor_type: 'user',
        action: 'registration_token_regenerated',
        entity_type: 'profile',
        entity_id: userId,
        details: { new_token: newToken },
      });

      return NextResponse.json({
        success: true,
        newToken,
        message: `Token registrasi baru berhasil dibuat: ${newToken}`,
      });
    }

    return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memproses permintaan.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const superadmin = await getAuthenticatedSuperadmin(req);
  if (!superadmin) {
    return NextResponse.json(
      { error: 'Akses ditolak: Hanya Superadmin yang berhak menghapus akun.' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID wajib disertakan.' }, { status: 400 });
    }

    if (userId === superadmin.id) {
      return NextResponse.json(
        { error: 'Anda tidak dapat menghapus akun Anda sendiri.' },
        { status: 400 }
      );
    }

    const deleted = await deleteProfile(userId);
    if (!deleted) {
      return NextResponse.json({ error: 'Akun tidak ditemukan.' }, { status: 404 });
    }

    addActivityLog({
      user_id: superadmin.id,
      user_name: superadmin.name,
      actor_type: 'user',
      action: 'user_account_deleted',
      entity_type: 'profile',
      entity_id: userId,
      details: { deleted_by: superadmin.email },
    });

    return NextResponse.json({ success: true, message: 'Akun berhasil dihapus.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal menghapus akun.' }, { status: 500 });
  }
}
