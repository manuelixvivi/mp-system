import { NextRequest, NextResponse } from 'next/server';
import {
  getAutomationSettings,
  updateAutomationSettings,
  addActivityLog,
} from '@/lib/db/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = getAutomationSettings();
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = updateAutomationSettings(body);

    addActivityLog({
      actor_type: 'user',
      action: 'settings_updated',
      entity_type: 'settings',
      details: { updates: body },
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
