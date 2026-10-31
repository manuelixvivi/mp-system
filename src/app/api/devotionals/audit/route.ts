import { NextRequest, NextResponse } from 'next/server';
import {
  getDevotionalById,
  saveDevotional,
  updateDevotionalAudit,
  addActivityLog,
  getProfileByEmail,
} from '@/lib/db/store';
import { formatCoffeeBreakTemplate } from '@/lib/llm/gemini';
import { DevotionalAuditStatus, UserRole } from '@/types';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user from session & validate role from database email
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const sessionUser = token ? await verifySessionToken(token) : null;
    if (!sessionUser || !sessionUser.email) {
      return NextResponse.json(
        { error: 'Akses ditolak: Sesi tidak valid atau belum login.' },
        { status: 401 }
      );
    }

    const auditor = await getProfileByEmail(sessionUser.email);
    if (!auditor || !auditor.is_active) {
      return NextResponse.json(
        { error: 'Akses ditolak: Akun tidak ditemukan atau non-aktif.' },
        { status: 403 }
      );
    }

    const role: UserRole = auditor.role;

    // Role check: Liturgi or Superadmin strictly from DB
    if (role !== 'liturgi' && role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya Tim Liturgi dan Superadmin yang berhak mengaudit.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { devotionalId, action, notes, updatedContent } = body;

    if (!devotionalId || !action) {
      return NextResponse.json({ error: 'devotionalId and action are required' }, { status: 400 });
    }

    const devotional = getDevotionalById(devotionalId);
    if (!devotional) {
      return NextResponse.json({ error: 'Data renungan tidak ditemukan' }, { status: 404 });
    }

    // If updating content (inline edit)
    if (action === 'update_content' && updatedContent) {
      const formatted = formatCoffeeBreakTemplate(
        updatedContent.verse_reference || devotional.verse_reference,
        updatedContent.verse_text || devotional.verse_text,
        updatedContent.reflection || devotional.reflection,
        updatedContent.mind_check || devotional.mind_check,
        updatedContent.take_one_step || devotional.take_one_step
      );

      const updated = saveDevotional({
        ...devotional,
        ...updatedContent,
        formatted_message: formatted,
        updated_at: new Date().toISOString(),
      });

      addActivityLog({
        user_id: auditor?.id,
        user_name: auditor?.name || 'Tim Liturgi',
        actor_type: 'user',
        action: 'devotional_edited',
        entity_type: 'devotional',
        entity_id: devotional.id,
        details: { changes: updatedContent },
      });

      return NextResponse.json({ success: true, devotional: updated });
    }

    // Valid audit statuses
    const validStatuses: DevotionalAuditStatus[] = ['approved', 'revision_required', 'rejected', 'pending'];
    const newStatus = action as DevotionalAuditStatus;

    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: `Status audit tidak valid: ${action}` }, { status: 400 });
    }

    const updated = updateDevotionalAudit(
      devotional.id,
      newStatus,
      auditor?.name || 'Tim Liturgi',
      notes
    );

    return NextResponse.json({
      success: true,
      message: `Status renungan berhasil diubah menjadi: ${newStatus.toUpperCase()}`,
      devotional: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
