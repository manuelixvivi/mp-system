import { NextRequest, NextResponse } from 'next/server';
import {
  getMembers,
  createMember,
  updateMember,
  deleteMember,
  getProfileByEmail,
  addActivityLog,
} from '@/lib/db/store';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

async function getAuthorizedUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const sessionUser = await verifySessionToken(token);
  if (!sessionUser?.email) return null;
  const dbUser = getProfileByEmail(sessionUser.email);
  if (!dbUser || !dbUser.is_active) return null;
  return dbUser;
}

export async function GET(req: NextRequest) {
  const members = getMembers();
  return NextResponse.json({ members });
}

export async function POST(req: NextRequest) {
  const user = await getAuthorizedUser(req);
  if (!user || (user.role !== 'superadmin' && user.role !== 'logistik')) {
    return NextResponse.json(
      { error: 'Akses ditolak: Hanya Tim Logistik dan Superadmin yang berwenang menambah anggota.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { full_name, birth_date, birth_month, birth_year, line_user_id, assigned_groups, notes } = body;

    if (!full_name || !birth_date || !birth_month) {
      return NextResponse.json({ error: 'Nama, tanggal lahir, dan bulan lahir wajib diisi.' }, { status: 400 });
    }

    const verificationStatus = line_user_id && line_user_id.trim().length > 0 ? 'verified' : 'not_set';

    const newMember = createMember({
      full_name,
      birth_date: Number(birth_date),
      birth_month: Number(birth_month),
      birth_year: birth_year ? Number(birth_year) : undefined,
      line_user_id: line_user_id || '',
      line_display_name: full_name,
      line_verification_status: verificationStatus,
      status: 'active',
      assigned_groups: assigned_groups || [],
      notes,
    });

    addActivityLog({
      user_id: user.id,
      user_name: user.name,
      actor_type: 'user',
      action: 'member_created',
      entity_type: 'member',
      entity_id: newMember.id,
      details: { name: newMember.full_name, birthDate: `${newMember.birth_date}/${newMember.birth_month}` },
    });

    return NextResponse.json({ success: true, member: newMember });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getAuthorizedUser(req);
  if (!user || (user.role !== 'superadmin' && user.role !== 'logistik')) {
    return NextResponse.json(
      { error: 'Akses ditolak: Hanya Tim Logistik dan Superadmin yang berwenang mengubah data anggota.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Member id is required' }, { status: 400 });
    }

    if (updates.line_user_id !== undefined) {
      updates.line_verification_status = updates.line_user_id && updates.line_user_id.trim().length > 0 ? 'verified' : 'not_set';
    }

    const updated = updateMember(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    addActivityLog({
      user_id: user.id,
      user_name: user.name,
      actor_type: 'user',
      action: 'member_updated',
      entity_type: 'member',
      entity_id: id,
      details: { updates },
    });

    return NextResponse.json({ success: true, member: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthorizedUser(req);
  if (!user || (user.role !== 'superadmin' && user.role !== 'logistik')) {
    return NextResponse.json(
      { error: 'Akses ditolak: Hanya Tim Logistik dan Superadmin yang berwenang menghapus data anggota.' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Member id is required' }, { status: 400 });
    }

    const deleted = deleteMember(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    addActivityLog({
      user_id: user.id,
      user_name: user.name,
      actor_type: 'user',
      action: 'member_deleted',
      entity_type: 'member',
      entity_id: id,
    });

    return NextResponse.json({ success: true, message: 'Member deleted' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
