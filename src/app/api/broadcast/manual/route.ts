import { NextRequest, NextResponse } from 'next/server';
import {
  getProfileById,
  getProfileByEmail,
  getDevotionalById,
  getDevotionalByDate,
  getLineGroups,
  getMembers,
  addDelivery,
  addActivityLog,
  addNotification,
} from '@/lib/db/store';
import { LineApiClient } from '@/lib/line/client';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth/session';
import { UserRole } from '@/types';
import { getWibIsoDate, getWibParts } from '@/lib/time';

export async function POST(req: NextRequest) {
  try {
    // 1. Verify authenticated user strictly from session cookie & database email
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const sessionUser = token ? await verifySessionToken(token) : null;
    if (!sessionUser || !sessionUser.email) {
      return NextResponse.json(
        { error: 'Akses ditolak: Sesi tidak valid atau belum login.' },
        { status: 401 }
      );
    }

    const sender = await getProfileByEmail(sessionUser.email);
    if (!sender || !sender.is_active) {
      return NextResponse.json(
        { error: 'Akses ditolak: Akun tidak ditemukan atau berstatus non-aktif.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { module, targetGroupIds, devotionalId, customMessage } = body;

    if (!module || !targetGroupIds || !Array.isArray(targetGroupIds) || targetGroupIds.length === 0) {
      return NextResponse.json({ error: 'Module and targetGroupIds are required' }, { status: 400 });
    }

    // Role check: validated strictly from database profile
    const role: UserRole = sender.role;

    if (module === 'devotional' && role !== 'superadmin' && role !== 'liturgi') {
      return NextResponse.json(
        { error: 'Akses ditolak: Anda tidak memiliki wewenang siaran renungan.' },
        { status: 403 }
      );
    }

    if (module === 'birthday' && role !== 'superadmin' && role !== 'logistik') {
      return NextResponse.json(
        { error: 'Akses ditolak: Anda tidak memiliki wewenang siaran ulang tahun.' },
        { status: 403 }
      );
    }

    const lineClient = new LineApiClient();
    const allGroups = await getLineGroups();
    const selectedGroups = allGroups.filter((g) => targetGroupIds.includes(g.id));

    if (selectedGroups.length === 0) {
      return NextResponse.json({ error: 'Tidak ada grup valid yang dipilih' }, { status: 400 });
    }

    let sentCount = 0;
    const errors: string[] = [];

    // --- EXECUTE DEVOTIONAL BROADCAST ---
    if (module === 'devotional') {
      let devotional = devotionalId ? await getDevotionalById(devotionalId) : null;
      if (!devotional) {
        const todayIso = getWibIsoDate();
        devotional = await getDevotionalByDate(todayIso);
      }

      const messageContent = customMessage || devotional?.formatted_message;
      if (!messageContent) {
        return NextResponse.json({ error: 'Konten renungan tidak ditemukan' }, { status: 400 });
      }

      for (const grp of selectedGroups) {
        const payload = LineApiClient.buildDevotionalMessage(messageContent);
        const result = await lineClient.pushMessage(grp.group_id, [payload]);

        if (result.success) {
          addDelivery({
            module: 'devotional',
            reference_id: devotional?.id || `dev_manual_${Date.now()}`,
            line_group_id: grp.id,
            group_name: grp.group_name,
            delivery_type: 'manual',
            sender_profile_id: sender?.id,
            sender_name: sender?.name || 'Administrator',
            sender_channel: 'dashboard',
            status: 'success',
            idempotency_key: `manual_dash_dev_${Date.now()}_${grp.id}`,
          });
          sentCount++;
        } else {
          errors.push(`${grp.group_name}: ${result.error}`);
        }
      }

      addActivityLog({
        user_id: sender?.id,
        user_name: sender?.name || 'Administrator',
        actor_type: 'user',
        action: 'manual_broadcast_sent',
        entity_type: 'devotional',
        entity_id: devotional?.id || 'manual',
        details: { targetGroups: selectedGroups.map((g) => g.group_name), successCount: sentCount },
      });
    }

    // --- EXECUTE BIRTHDAY BROADCAST ---
    if (module === 'birthday') {
      const { day: todayDate, month: todayMonth } = getWibParts();

      const allMembers = await getMembers();
      const birthdayMembers = allMembers.filter(
        (m) => m.status === 'active' && m.birth_date === todayDate && m.birth_month === todayMonth
      );

      if (birthdayMembers.length === 0) {
        return NextResponse.json({ error: 'Tidak ada anggota aktif yang berulang tahun hari ini.' }, { status: 400 });
      }

      for (const grp of selectedGroups) {
        // Members assigned to this group or all if no group assigned
        const grpMembers = birthdayMembers.filter(
          (m) => !m.assigned_groups || m.assigned_groups.length === 0 || m.assigned_groups.includes(grp.id)
        );

        if (grpMembers.length === 0) continue;

        const batches = LineApiClient.buildBirthdayBatches(grpMembers);
        for (const b of batches) {
          const res = await lineClient.pushMessage(grp.group_id, [b.messagePayload]);
          if (res.success) {
            addDelivery({
              module: 'birthday',
              reference_id: `bday_manual_${Date.now()}`,
              line_group_id: grp.id,
              group_name: grp.group_name,
              delivery_type: 'manual',
              sender_profile_id: sender?.id,
              sender_name: sender?.name || 'Administrator',
              sender_channel: 'dashboard',
              status: 'success',
              idempotency_key: `manual_dash_bday_${Date.now()}_${grp.id}_b${b.batchNumber}`,
            });
          }
        }
        sentCount++;
      }

      addActivityLog({
        user_id: sender?.id,
        user_name: sender?.name || 'Administrator',
        actor_type: 'user',
        action: 'manual_broadcast_sent',
        entity_type: 'birthday',
        entity_id: 'bday_manual',
        details: { targetGroups: selectedGroups.map((g) => g.group_name), recipientsCount: birthdayMembers.length },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Manual broadcast berhasil dikirimkan ke ${sentCount} grup!`,
      sentCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
