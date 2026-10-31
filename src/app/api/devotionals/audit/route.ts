import { NextRequest, NextResponse } from 'next/server';
import {
  getDevotionalById,
  saveDevotional,
  updateDevotionalAudit,
  addActivityLog,
  getProfileById,
} from '@/lib/db/store';
import { formatCoffeeBreakTemplate } from '@/lib/llm/gemini';
import { DevotionalAuditStatus, UserRole } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { devotionalId, action, notes, updatedContent, auditorProfileId } = body;

    if (!devotionalId || !action) {
      return NextResponse.json({ error: 'devotionalId and action are required' }, { status: 400 });
    }

    const auditor = getProfileById(auditorProfileId || '22222222-2222-2222-2222-222222222222');
    const role: UserRole = auditor ? auditor.role : 'liturgi';

    // Role check: Liturgi or Superadmin
    if (role !== 'liturgi' && role !== 'superadmin') {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Tim Liturgi dan Superadmin yang berhak mengaudit.' }, { status: 403 });
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
