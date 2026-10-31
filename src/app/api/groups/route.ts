import { NextRequest, NextResponse } from 'next/server';
import {
  getLineGroups,
  createLineGroup,
  updateLineGroup,
  addActivityLog,
} from '@/lib/db/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const groups = getLineGroups();
  return NextResponse.json({ groups });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { group_id, group_name, description, assigned_modules, member_count } = body;

    if (!group_id || !group_name) {
      return NextResponse.json({ error: 'Group ID dan Nama Grup wajib diisi.' }, { status: 400 });
    }

    const newGroup = createLineGroup({
      group_id,
      group_name,
      description,
      is_active: true,
      assigned_modules: assigned_modules || ['devotional', 'birthday'],
      member_count: Number(member_count) || 0,
      bot_joined_at: new Date().toISOString(),
    });

    addActivityLog({
      actor_type: 'user',
      action: 'group_created',
      entity_type: 'line_group',
      entity_id: newGroup.id,
      details: { name: newGroup.group_name },
    });

    return NextResponse.json({ success: true, group: newGroup });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Group id is required' }, { status: 400 });
    }

    const updated = updateLineGroup(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    addActivityLog({
      actor_type: 'user',
      action: 'group_updated',
      entity_type: 'line_group',
      entity_id: id,
      details: { updates },
    });

    return NextResponse.json({ success: true, group: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
