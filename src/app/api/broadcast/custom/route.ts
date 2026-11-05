import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth/session';
import { getProfileByEmail, getLineGroups, addDelivery, addActivityLog } from '@/lib/db/store';
import { LineApiClient } from '@/lib/line/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // 1. Authenticate user
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Akses ditolak: Silakan login terlebih dahulu.' }, { status: 401 });
  }

  const sessionUser = await verifySessionToken(token);
  if (!sessionUser?.email) {
    return NextResponse.json({ error: 'Sesi tidak valid.' }, { status: 401 });
  }

  const user = await getProfileByEmail(sessionUser.email);
  if (!user || !user.is_active) {
    return NextResponse.json({ error: 'Akun Anda tidak aktif.' }, { status: 403 });
  }

  // 2. Authorization check: All officer divisions are allowed, EXCEPT 'anggota_aktif'
  // (In profiles, role can be superadmin, liturgi, logistik, pubdok; if user has a community_role 'anggota_aktif', reject)
  if ((user as any).community_role === 'anggota_aktif') {
    return NextResponse.json(
      { error: 'Akses ditolak: Anggota aktif biasa tidak berwenang mengirim pesan siaran custom ke grup.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { target_group_ids, message_text, image_url, pics } = body;

    if (!message_text || message_text.trim().length === 0) {
      return NextResponse.json({ error: 'Pesan / caption teks wajib diisi.' }, { status: 400 });
    }

    if (!Array.isArray(target_group_ids) || target_group_ids.length === 0) {
      return NextResponse.json({ error: 'Pilih minimal satu grup LINE tujuan.' }, { status: 400 });
    }

    const allGroups = await getLineGroups();
    const activeGroups = allGroups.filter(
      (g) => g.is_active && (target_group_ids.includes(g.id) || target_group_ids.includes(g.group_id))
    );

    if (activeGroups.length === 0) {
      return NextResponse.json({ error: 'Tidak ada grup tujuan yang aktif di sistem.' }, { status: 400 });
    }

    // Build PIC signature block
    let picFooter = '';
    if (Array.isArray(pics) && pics.length > 0) {
      picFooter = '\n\n📌 PIC / Kontak Penanggung Jawab:\n' +
        pics
          .map((p: any) => {
            const roleStr = p.role ? ` (${p.role})` : '';
            const lineStr = p.line_id ? ` — LINE: @${String(p.line_id).replace(/^@/, '')}` : '';
            return `• ${p.name}${roleStr}${lineStr}`;
          })
          .join('\n');
    }

    const fullText = `${message_text.trim()}${picFooter}`;

    // Build LINE messages
    const messages: any[] = [];

    // Optional image message
    if (image_url && typeof image_url === 'string' && image_url.startsWith('http')) {
      messages.push({
        type: 'image',
        originalContentUrl: image_url,
        previewImageUrl: image_url,
      });
    }

    // Text message
    messages.push({
      type: 'text',
      text: fullText,
    });

    const lineClient = new LineApiClient();
    let successCount = 0;
    const errors: string[] = [];

    for (const group of activeGroups) {
      const res = await lineClient.pushMessage(group.group_id, messages);
      if (res.success) {
        successCount++;
        addDelivery({
          module: 'custom',
          reference_id: `custom_${Date.now()}_${group.id}`,
          line_group_id: group.id,
          group_name: group.group_name,
          delivery_type: 'manual',
          sender_channel: 'dashboard',
          status: 'success',
          idempotency_key: `custom_${Date.now()}_${group.id}`,
        });
      } else {
        errors.push(`${group.group_name}: ${res.error || 'Gagal mengirim'}`);
        addDelivery({
          module: 'custom',
          reference_id: `custom_${Date.now()}_${group.id}`,
          line_group_id: group.id,
          group_name: group.group_name,
          delivery_type: 'manual',
          sender_channel: 'dashboard',
          status: 'failed',
          error_message: res.error,
          idempotency_key: `custom_${Date.now()}_${group.id}`,
        });
      }
    }

    addActivityLog({
      user_id: user.id,
      user_name: user.name,
      actor_type: 'user',
      action: 'custom_broadcast_sent',
      entity_type: 'broadcast',
      details: {
        groupsCount: activeGroups.length,
        successCount,
        hasImage: !!image_url,
        picsCount: pics?.length || 0,
      },
    });

    return NextResponse.json({
      success: successCount > 0,
      totalTargets: activeGroups.length,
      successCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Pesan custom berhasil dikirim ke ${successCount} dari ${activeGroups.length} grup LINE target.`,
    });
  } catch (err: any) {
    console.error('Custom broadcast error:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
