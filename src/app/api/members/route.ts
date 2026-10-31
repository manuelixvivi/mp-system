import { NextRequest, NextResponse } from 'next/server';
import {
  getMembers,
  createMember,
  updateMember,
  deleteMember,
  deleteMembersBulk,
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
    const {
      full_name,
      baptismal_name,
      birth_date,
      birth_month,
      birth_year,
      class_origin,
      entry_year,
      line_user_id,
      instagram_account,
      assigned_groups,
      notes,
    } = body;

    if (!full_name || !birth_date || !birth_month) {
      return NextResponse.json({ error: 'Nama lengkap, tanggal lahir, dan bulan lahir wajib diisi.' }, { status: 400 });
    }

    const verificationStatus = line_user_id && line_user_id.trim().length > 0 ? 'verified' : 'not_set';

    const cleanInstagram = instagram_account
      ? (instagram_account.trim().startsWith('@') ? instagram_account.trim() : `@${instagram_account.trim()}`)
      : undefined;

    const newMember = createMember({
      full_name: full_name.trim(),
      baptismal_name: baptismal_name?.trim() || undefined,
      birth_date: Number(birth_date),
      birth_month: Number(birth_month),
      birth_year: birth_year ? Number(birth_year) : undefined,
      class_origin: class_origin?.trim() || undefined,
      entry_year: entry_year ? Number(entry_year) : undefined,
      line_user_id: line_user_id?.trim() || '',
      line_display_name: full_name.trim(),
      instagram_account: cleanInstagram,
      line_verification_status: verificationStatus,
      status: 'active',
      assigned_groups: assigned_groups || [],
      notes: notes?.trim() || undefined,
    });

    addActivityLog({
      user_id: user.id,
      user_name: user.name,
      actor_type: 'user',
      action: 'member_created',
      entity_type: 'member',
      entity_id: newMember.id,
      details: {
        name: newMember.full_name,
        baptismal: newMember.baptismal_name,
        birthDate: `${newMember.birth_date}/${newMember.birth_month}`,
        classOrigin: newMember.class_origin,
        entryYear: newMember.entry_year,
      },
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
      updates.line_verification_status =
        updates.line_user_id && updates.line_user_id.trim().length > 0 ? 'verified' : 'not_set';
    }

    if (updates.instagram_account !== undefined && updates.instagram_account) {
      const ig = updates.instagram_account.trim();
      updates.instagram_account = ig.startsWith('@') ? ig : `@${ig}`;
    }

    if (updates.birth_date !== undefined) updates.birth_date = Number(updates.birth_date);
    if (updates.birth_month !== undefined) updates.birth_month = Number(updates.birth_month);
    if (updates.birth_year !== undefined) updates.birth_year = updates.birth_year ? Number(updates.birth_year) : undefined;
    if (updates.entry_year !== undefined) updates.entry_year = updates.entry_year ? Number(updates.entry_year) : undefined;

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
    // Check for bulk deletion via JSON body or query parameters
    let idsToDelete: string[] = [];
    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get('id');
    const queryIds = searchParams.get('ids');

    if (queryIds) {
      idsToDelete = queryIds.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (queryId) {
      idsToDelete = [queryId.trim()];
    } else {
      // Check if body contains ids array
      try {
        const body = await req.json();
        if (Array.isArray(body?.ids)) {
          idsToDelete = body.ids.map((s: any) => String(s).trim()).filter(Boolean);
        } else if (body?.id) {
          idsToDelete = [String(body.id).trim()];
        }
      } catch (err) {
        // Body was empty or not json, continue with idsToDelete
      }
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: 'Pilih setidaknya 1 anggota untuk dihapus.' }, { status: 400 });
    }

    if (idsToDelete.length === 1) {
      const singleId = idsToDelete[0];
      const deleted = deleteMember(singleId);
      if (!deleted) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      addActivityLog({
        user_id: user.id,
        user_name: user.name,
        actor_type: 'user',
        action: 'member_deleted',
        entity_type: 'member',
        entity_id: singleId,
      });

      return NextResponse.json({ success: true, message: '1 data anggota berhasil dihapus.', count: 1 });
    }

    // Bulk deletion
    const result = deleteMembersBulk(idsToDelete);

    addActivityLog({
      user_id: user.id,
      user_name: user.name,
      actor_type: 'user',
      action: 'members_bulk_deleted',
      entity_type: 'member',
      details: {
        requestedCount: idsToDelete.length,
        deletedCount: result.count,
        deletedIds: result.deletedIds,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${result.count} data anggota berhasil dihapus.`,
      count: result.count,
      deletedIds: result.deletedIds,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
