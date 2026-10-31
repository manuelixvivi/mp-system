import { NextRequest, NextResponse } from 'next/server';
import {
  getMembers,
  createMember,
  updateMember,
  deleteMember,
  addActivityLog,
} from '@/lib/db/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const members = getMembers();
  return NextResponse.json({ members });
}

export async function POST(req: NextRequest) {
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
