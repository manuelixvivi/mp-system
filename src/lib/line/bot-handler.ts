import {
  getProfileByLineUserId,
  getProfileByLineUserIdAsync,
  activateProfileByToken,
  addActivityLog,
  getDevotionalByDate,
  getMembers,
  getLineGroups,
  updateDevotionalAudit,
  addDelivery,
  ensureLineGroupTracked,
} from '../db/store';
import { LineApiClient } from './client';
import { UserRole, LineGroup } from '@/types';
import { getWibParts, getWibIsoDate } from '../time';

// Pending confirmation memory store for personal chat sessions
interface PendingAction {
  userId: string;
  action: 'broadcast_devotional' | 'broadcast_birthday';
  targetGroupIds?: string[];
  expiresAt: number;
}

const pendingActions = new Map<string, PendingAction>();

function formatGroupListMessage(groups: LineGroup[]): string {
  if (!groups || groups.length === 0) {
    return `╔═══════════════════════╗\n  📋 DAFTAR GROUP ID BOT MP\n╚═══════════════════════╝\n\n⚠️ Belum ada grup LINE yang terdata dalam sistem.\n\n💡 Pastikan bot telah diundang ke dalam grup target. Sistem akan otomatis merekam Group ID setiap kali ada event atau pesan masuk dari grup tersebut.`;
  }

  const items = groups
    .map((g, index) => {
      const modules =
        g.assigned_modules && g.assigned_modules.length > 0
          ? g.assigned_modules.join(', ')
          : 'Belum diatur';
      const status = g.is_active ? 'Aktif ✅' : 'Nonaktif ⏸️';
      return `${index + 1}. 👥 Nama: ${g.group_name || 'Tanpa Nama'}\n   🆔 Group ID: ${g.group_id}\n   📌 Status: ${status}\n   🏷️ Modul: ${modules}`;
    })
    .join('\n\n');

  return `╔═══════════════════════╗\n  📋 DAFTAR GROUP ID BOT MP\n╚═══════════════════════╝\n\nTotal Grup Terdata: ${groups.length} grup\n\n${items}\n\n💡 Salin Group ID di atas untuk dimasukkan ke konfigurasi sistem.`;
}

export async function handleLineWebhookEvent(event: any): Promise<any> {
  const lineClient = new LineApiClient();

  // RULE 1: STRICT GROUP POLICY (PRD 3.4)
  // Bot is strictly broadcast-only in LINE groups, with special support for Superadmin commands (/get_all_groupid)
  if (event.source?.type === 'group' || event.source?.type === 'room') {
    const groupId = event.source.groupId || event.source.roomId;

    // Automatically track / update the group in database
    if (groupId) {
      let groupTitle: string | undefined;
      try {
        const summary = await lineClient.getGroupSummary(groupId);
        if (summary?.groupName) groupTitle = summary.groupName;
      } catch {}
      await ensureLineGroupTracked(groupId, groupTitle);
    }

    // If bot joined group, log it silently
    if (event.type === 'join') {
      console.log(`[LINE BOT] Joined group: ${groupId}`);
      addActivityLog({
        actor_type: 'line_bot',
        action: 'bot_joined_group',
        entity_type: 'line_group',
        entity_id: groupId,
        details: { groupId },
      });
      return { status: 'bot_joined_group', groupId };
    }

    const groupText = (event.message?.text || '').trim();

    // Check if user sent /myid inside a group
    if (
      event.type === 'message' &&
      event.message?.type === 'text' &&
      (groupText.toLowerCase() === '/myid' || groupText.toLowerCase() === '/id')
    ) {
      const senderUserId = event.source.userId;
      if (senderUserId && event.replyToken) {
        await lineClient.replyMessage(event.replyToken, [
          {
            type: 'text',
            text: `🆔 LINE USER ID ANDA:\n\n${senderUserId}\n\n💡 Salin ID di atas dan masukkan ke data anggota (Web Dashboard / Excel) agar bot dapat melakukan mention/tag otomatis saat ulang tahun.`,
          },
        ]);
        return { status: 'replied_myid_in_group', senderUserId };
      }
    }

    // Check if a Superadmin sent /get_all_groupid inside a group
    if (
      event.type === 'message' &&
      event.message?.type === 'text' &&
      groupText.toLowerCase() === '/get_all_groupid'
    ) {
      const senderUserId = event.source.userId;
      if (senderUserId) {
        const senderProfile = await getProfileByLineUserIdAsync(senderUserId);
        if (senderProfile && senderProfile.role === 'superadmin') {
          const allGroups = await getLineGroups();
          const replyText = formatGroupListMessage(allGroups);
          if (event.replyToken) {
            await lineClient.replyMessage(event.replyToken, [{ type: 'text', text: replyText }]);
          }

          addActivityLog({
            user_id: senderProfile.id,
            user_name: senderProfile.name,
            actor_type: 'user',
            action: 'get_all_groupid_in_group',
            entity_type: 'line_bot',
            entity_id: groupId,
            details: { totalGroups: allGroups.length },
          });

          return { status: 'replied_get_all_groupid_in_group', total: allGroups.length };
        }
      }
    }

    // NEVER respond to general chatting in groups!
    return { status: 'ignored_group_message' };
  }

  // RULE 2: PERSONAL CHAT HANDLING (PRD 3.3)
  if (event.source?.type !== 'user' || event.type !== 'message' || event.message?.type !== 'text') {
    return { status: 'ignored_non_text_event' };
  }

  const lineUserId = event.source.userId;
  const rawText = (event.message.text || '').trim();
  const replyToken = event.replyToken;

  // 1. Check for Account Registration Command (/registrasi_akun <TOKEN>)
  const matchReg = rawText.match(/^\/registrasi_akun(?:\s+([A-Za-z0-9_-]+))?$/i);
  if (matchReg) {
    const token = (matchReg[1] || '').trim().toUpperCase();

    if (!token) {
      const reply = `⚠️ FORMAT REGISTRASI TIDAK LENGKAP\n\nUntuk mengaktivasi akun, gunakan format:\n/registrasi_akun <TOKEN>\n\nContoh:\n/registrasi_akun ABEL123`;
      if (replyToken) await lineClient.replyMessage(replyToken, [{ type: 'text', text: reply }]);
      return { status: 'invalid_token_format', text: reply };
    }

    const activation = await activateProfileByToken(token, lineUserId);
    if (!activation.success || !activation.profile) {
      const reply = `⚠️ GAGAL AKTIVASI AKUN\n\n${activation.error || 'Token tidak valid.'}\n\nPastikan format token sudah sesuai dengan yang diberikan oleh Superadmin (contoh: ABEL123). Jika token hangus, silakan minta Superadmin untuk membuat token baru.`;
      if (replyToken) await lineClient.replyMessage(replyToken, [{ type: 'text', text: reply }]);
      return { status: 'activation_failed', text: reply };
    }

    const prof = activation.profile;
    const roleLabels: Record<string, string> = {
      superadmin: 'Superadmin (Akses Penuh)',
      liturgi: 'Tim Liturgi (Audit & Renungan)',
      logistik: 'Tim Logistik (Anggota & Ulang Tahun)',
    };

    const reply = `🎉 REGISTRASI AKUN BERHASIL!\n\nHalo ${prof.name}! Akun petugas Anda telah resmi diaktivasi dan ditautkan dengan akun LINE ini.\n\n👤 Nama Petugas: ${prof.name}\n📧 Email: ${prof.email}\n🛡️ Hak Akses: ${roleLabels[prof.role] || prof.role}\n📱 LINE User ID: ${lineUserId}\n\n💡 Perintah Bot yang dapat Anda gunakan:\n• /menu — Tampilkan menu aksi\n• /status — Cek status otomatisasi hari ini\n• /help — Bantuan perintah bot\n\nAnda juga sudah dapat login ke Web Dashboard MP Control System menggunakan email dan password Anda.`;

    if (replyToken) await lineClient.replyMessage(replyToken, [{ type: 'text', text: reply }]);
    return { status: 'activation_success', text: reply, profile: prof };
  }

  // 1b. Check for /myid or /id command (accessible by anyone)
  if (rawText.toLowerCase() === '/myid' || rawText.toLowerCase() === '/id') {
    const reply = `🆔 LINE USER ID ANDA:\n\n${lineUserId}\n\n💡 Salin ID di atas dan masukkan ke data anggota (Web Dashboard / Excel) agar bot dapat melakukan mention/tag otomatis saat ulang tahun.`;
    if (replyToken) await lineClient.replyMessage(replyToken, [{ type: 'text', text: reply }]);
    return { status: 'replied_myid', lineUserId };
  }

  // 2. Verify Authentication & Role
  const userProfile = (await getProfileByLineUserIdAsync(lineUserId)) || getProfileByLineUserId(lineUserId);

  if (!userProfile) {
    // Log unauthorized access attempt
    addActivityLog({
      actor_type: 'user',
      action: 'unauthorized_line_access',
      entity_type: 'line_bot',
      entity_id: lineUserId,
      details: { attemptedText: rawText },
    });

    const reply = [
      {
        type: 'text',
        text: `🔒 AKSES DITOLAK — MP CONTROL SYSTEM\n\nAkun LINE Anda (${lineUserId}) belum terdaftar sebagai petugas aktif MP Control System.\n\n📌 AKTIVASI AKUN PETUGAS:\nJika Anda telah menerima Token Sekali Pakai dari Superadmin, silakan kirim pesan:\n/registrasi_akun <TOKEN>\nContoh: /registrasi_akun ABEL123\n\nAtau hubungi Superadmin untuk membuatkan akun dan token Anda.`,
      },
    ];
    if (replyToken) await lineClient.replyMessage(replyToken, reply);
    return { status: 'unauthorized', lineUserId };
  }

  // If already registered and tries to run /registrasi_akun again
  if (rawText.toLowerCase().startsWith('/registrasi_akun')) {
    const sendReply = async (text: string) => {
      if (replyToken) await lineClient.replyMessage(replyToken, [{ type: 'text', text }]);
      return { status: 'replied', text };
    };
    return await sendReply(
      `ℹ️ INFORMASI AKUN\n\nAkun LINE ini sudah terdaftar atas nama ${userProfile.name} (${userProfile.role.toUpperCase()}).\nTidak perlu melakukan aktivasi ulang. Silakan ketik /menu untuk mulai menggunakan bot.`
    );
  }

  // 2. Process Command
  const command = rawText.toLowerCase();
  const todayIso = getWibIsoDate();

  // Helper response
  const sendReply = async (text: string) => {
    if (replyToken) {
      await lineClient.replyMessage(replyToken, [{ type: 'text', text }]);
    }
    return { status: 'replied', text };
  };

  // Log incoming recognized command
  addActivityLog({
    user_id: userProfile.id,
    user_name: userProfile.name,
    actor_type: 'user',
    action: 'line_command_received',
    entity_type: 'line_bot',
    entity_id: command,
    details: { command: rawText, role: userProfile.role },
  });

  // --- /HELP ---
  if (command === '/help') {
    return await sendReply(getHelpMessage(userProfile.role, userProfile.name));
  }

  // --- /MENU ---
  if (command === '/menu') {
    return await sendReply(getMenuMessage(userProfile.role, userProfile.name));
  }

  // --- /STATUS ---
  if (command === '/status' || command.startsWith('/status ')) {
    return await sendReply(await getStatusMessage(userProfile.role, todayIso));
  }

  // --- /GET_ALL_GROUPID (SUPERADMIN EXCLUSIVE) ---
  if (command === '/get_all_groupid') {
    if (userProfile.role !== 'superadmin') {
      return await sendReply('⛔ Akses Ditolak: Perintah /get_all_groupid hanya dapat digunakan oleh Superadmin.');
    }

    const allGroups = await getLineGroups();
    const reply = formatGroupListMessage(allGroups);

    addActivityLog({
      user_id: userProfile.id,
      user_name: userProfile.name,
      actor_type: 'user',
      action: 'get_all_groupid_personal',
      entity_type: 'line_bot',
      entity_id: 'get_all_groupid',
      details: { totalGroups: allGroups.length },
    });

    return await sendReply(reply);
  }

  // --- DEVOTIONAL AUDIT VIA CHAT (/approve, /reject) ---
  if (command === '/approve' || command.startsWith('/approve ')) {
    if (userProfile.role !== 'superadmin' && userProfile.role !== 'liturgi') {
      return await sendReply('⛔ Akses Ditolak: Hanya Tim Liturgi & Superadmin yang berwenang mengaudit renungan.');
    }
    const devotional = await getDevotionalByDate(todayIso);
    if (!devotional) {
      return await sendReply(`⚠️ Renungan hari ini (${todayIso}) belum tersedia dalam sistem.`);
    }
    await updateDevotionalAudit(devotional.id, 'approved', userProfile.name, 'Approved via LINE Personal Chat');
    return await sendReply(`✅ BERHASIL: Renungan hari ini (${todayIso}) telah disetujui (Approved) oleh ${userProfile.name}. Siap dikirim pada jadwal broadcast 09:45 WIB.`);
  }

  if (command === '/reject' || command.startsWith('/reject ')) {
    if (userProfile.role !== 'superadmin' && userProfile.role !== 'liturgi') {
      return await sendReply('⛔ Akses Ditolak: Hanya Tim Liturgi & Superadmin yang berwenang menolak renungan.');
    }
    const devotional = await getDevotionalByDate(todayIso);
    if (!devotional) {
      return await sendReply(`⚠️ Renungan hari ini (${todayIso}) belum tersedia dalam sistem.`);
    }
    await updateDevotionalAudit(devotional.id, 'rejected', userProfile.name, 'Rejected via LINE Personal Chat');
    return await sendReply(`❌ PERINGATAN: Renungan hari ini (${todayIso}) telah DITOLAK (Rejected) oleh ${userProfile.name}. Otomatisasi broadcast renungan 09:45 WIB TIDAK AKAN DIKIRIM.`);
  }

  // --- /BROADCAST INITIATION ---
  if (command === '/broadcast' || command === '/broadcast devotional' || command === '/broadcast renungan') {
    if (userProfile.role !== 'superadmin' && userProfile.role !== 'liturgi') {
      return await sendReply('⛔ Akses Ditolak: Anda tidak memiliki wewenang untuk broadcast renungan (Daily Devotional).');
    }

    const devotional = await getDevotionalByDate(todayIso);
    if (!devotional) {
      return await sendReply('⚠️ Renungan hari ini belum tersedia.');
    }

    pendingActions.set(lineUserId, {
      userId: lineUserId,
      action: 'broadcast_devotional',
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 min
    });

    return await sendReply(
      `📢 KONFIRMASI BROADCAST RENUNGAN\n\nAnda akan mengirim renungan harian:\n📖 ${devotional.verse_reference}\nStatus Audit: ${devotional.audit_status.toUpperCase()}\n\nKetik:\n👉 /confirm\nuntuk mengeksekusi pengiriman ke seluruh grup renungan aktif.\n\nAtau ketik /batal untuk membatalkan.`
    );
  }

  if (command === '/broadcast birthday' || command === '/broadcast ultah') {
    if (userProfile.role !== 'superadmin' && userProfile.role !== 'logistik') {
      return await sendReply('⛔ Akses Ditolak: Anda tidak memiliki wewenang untuk broadcast ulang tahun (Birthday Automation).');
    }

    const { day: todayDate, month: todayMonth } = getWibParts();
    const bdayMembers = (await getMembers()).filter(
      (m) => m.status === 'active' && m.birth_date === todayDate && m.birth_month === todayMonth
    );

    if (bdayMembers.length === 0) {
      return await sendReply('ℹ️ Tidak ada anggota yang berulang tahun hari ini.');
    }

    pendingActions.set(lineUserId, {
      userId: lineUserId,
      action: 'broadcast_birthday',
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    const memberNames = bdayMembers.map((m) => `• ${m.full_name}`).join('\n');
    return await sendReply(
      `🎂 KONFIRMASI BROADCAST ULANG TAHUN\n\nAnggota berulang tahun hari ini (${bdayMembers.length} orang):\n${memberNames}\n\nKetik:\n👉 /confirm\nuntuk mengeksekusi pengiriman dengan LINE mention asli.\n\nAtau ketik /batal untuk membatalkan.`
    );
  }

  // --- /BATAL ---
  if (command === '/batal' || command === '/cancel') {
    if (pendingActions.has(lineUserId)) {
      pendingActions.delete(lineUserId);
      return await sendReply('🚫 Aksi broadcast telah dibatalkan.');
    }
    return await sendReply('Tidak ada aksi aktif yang sedang menunggu konfirmasi.');
  }

  // --- /CONFIRM (Protected Execution) ---
  if (command === '/confirm') {
    const pending = pendingActions.get(lineUserId);
    if (!pending || pending.expiresAt < Date.now()) {
      pendingActions.delete(lineUserId);
      return await sendReply('⚠️ Tidak ada aksi yang menunggu konfirmasi atau sesi konfirmasi telah kedaluwarsa.');
    }

    pendingActions.delete(lineUserId);

    if (pending.action === 'broadcast_devotional') {
      const devotional = await getDevotionalByDate(todayIso);
      const allGroups = await getLineGroups();
      const groups = allGroups.filter((g) => g.is_active && g.assigned_modules.includes('devotional'));

      let sentCount = 0;
      for (const grp of groups) {
        const payload = LineApiClient.buildDevotionalMessage(devotional?.formatted_message || '');
        await lineClient.pushMessage(grp.group_id, [payload]);

        addDelivery({
          module: 'devotional',
          reference_id: devotional?.id || '',
          line_group_id: grp.id,
          group_name: grp.group_name,
          delivery_type: 'manual',
          sender_profile_id: userProfile.id,
          sender_name: userProfile.name,
          sender_channel: 'line_chat',
          status: 'success',
          idempotency_key: `manual_chat_dev_${Date.now()}_${grp.id}`,
        });
        sentCount++;
      }

      addActivityLog({
        user_id: userProfile.id,
        user_name: userProfile.name,
        actor_type: 'user',
        action: 'manual_broadcast_sent',
        entity_type: 'devotional',
        entity_id: devotional?.id,
        details: { channel: 'line_chat', sentToGroups: sentCount },
      });

      return await sendReply(`🎉 SUKSES: Renungan berhasil dibroadcast secara manual ke ${sentCount} grup LINE!`);
    }

    if (pending.action === 'broadcast_birthday') {
      const { day: todayDate, month: todayMonth } = getWibParts();
      const bdayMembers = (await getMembers()).filter(
        (m) => m.status === 'active' && m.birth_date === todayDate && m.birth_month === todayMonth
      );
      const allGroups = await getLineGroups();
      const groups = allGroups.filter((g) => g.is_active && g.assigned_modules.includes('birthday'));

      let sentCount = 0;
      for (const grp of groups) {
        const batches = LineApiClient.buildBirthdayBatches(bdayMembers);
        for (const b of batches) {
          await lineClient.pushMessage(grp.group_id, [b.messagePayload]);
        }

        addDelivery({
          module: 'birthday',
          reference_id: `bday_${Date.now()}`,
          line_group_id: grp.id,
          group_name: grp.group_name,
          delivery_type: 'manual',
          sender_profile_id: userProfile.id,
          sender_name: userProfile.name,
          sender_channel: 'line_chat',
          status: 'success',
          idempotency_key: `manual_chat_bday_${Date.now()}_${grp.id}`,
        });
        sentCount++;
      }

      addActivityLog({
        user_id: userProfile.id,
        user_name: userProfile.name,
        actor_type: 'user',
        action: 'manual_broadcast_sent',
        entity_type: 'birthday',
        entity_id: 'birthday_manual',
        details: { channel: 'line_chat', sentToGroups: sentCount, memberCount: bdayMembers.length },
      });

      return await sendReply(`🎂 SUKSES: Ucapan ulang tahun berhasil dibroadcast secara manual ke ${sentCount} grup LINE!`);
    }
  }

  // Default fallback for unrecognized command
  return await sendReply(
    `Perintah "${rawText}" tidak dikenali.\n\nKetik /help untuk melihat daftar perintah atau /menu untuk membuka menu navigasi.`
  );
}

function getHelpMessage(role: UserRole, userName: string): string {
  const roleName = role === 'superadmin' ? 'Superadmin' : role === 'liturgi' ? 'Tim Liturgi' : 'Tim Logistik';

  let commands = `📋 BANTUAN PERINTAH MP CONTROL BOT\n\nHalo, ${userName} (${roleName})!\nBerikut perintah yang dapat Anda gunakan:\n\n• /menu — Tampilkan ringkasan menu wewenang\n• /status — Cek status otomatisasi & jadwal\n• /myid — Cek LINE User ID akun Anda untuk tag ultah\n• /help — Tampilkan pesan panduan ini\n`;

  if (role === 'superadmin') {
    commands += `\n[Alat Superadmin]\n• /get_all_groupid — Tampilkan semua Group ID yang ada bot ini di dalamnya\n`;
  }

  if (role === 'superadmin' || role === 'liturgi') {
    commands += `\n[Modul Renungan]\n• /approve — Setujui renungan hari ini\n• /reject — Tolak renungan hari ini\n• /broadcast devotional — Broadcast manual renungan\n`;
  }

  if (role === 'superadmin' || role === 'logistik') {
    commands += `\n[Modul Ulang Tahun]\n• /broadcast birthday — Broadcast manual ucapan ulang tahun\n`;
  }

  commands += `\n💡 Semua perintah broadcast akan meminta konfirmasi (/confirm) sebelum dikirim ke grup.`;
  return commands;
}

function getMenuMessage(role: UserRole, userName: string): string {
  const roleBadge = role === 'superadmin' ? '🛡️ SUPERADMIN' : role === 'liturgi' ? '📖 TIM LITURGI' : '📦 TIM LOGISTIK';

  let msg = `╔═══════════════════════╗\n  MP CONTROL SYSTEM BOT\n╚═══════════════════════╝\n\n👤 Pengguna: ${userName}\nRole: ${roleBadge}\n\nPilih aksi dengan mengetik perintah:\n\n1️⃣ /status — Pantau status sistem hari ini\n`;

  if (role === 'superadmin') {
    msg += `2️⃣ /get_all_groupid — Dapatkan semua Group ID bot\n`;
  }

  if (role === 'superadmin' || role === 'liturgi') {
    msg += `3️⃣ /broadcast devotional — Kirim renungan harian sekarang\n4️⃣ /approve — Approve renungan hari ini\n`;
  }

  if (role === 'superadmin' || role === 'logistik') {
    msg += `5️⃣ /broadcast birthday — Kirim ucapan ultah hari ini\n`;
  }

  msg += `\nℹ️ Akses dashboard web lengkap di: https://mp-control.vercel.app`;
  return msg;
}

async function getStatusMessage(role: UserRole, todayIso: string): Promise<string> {
  const devotional = await getDevotionalByDate(todayIso);
  const { day: todayDate, month: todayMonth } = getWibParts();
  const allMembers = await getMembers();
  const bdayMembers = allMembers.filter(
    (m) => m.status === 'active' && m.birth_date === todayDate && m.birth_month === todayMonth
  );

  let msg = `📊 STATUS SISTEM MP CONTROL (${todayIso} WIB)\n\n`;

  if (role === 'superadmin' || role === 'liturgi') {
    msg += `📖 DAILY DEVOTIONAL:\n`;
    if (devotional) {
      msg += `• Status Audit: ${devotional.audit_status.toUpperCase()}\n`;
      msg += `• Ayat: ${devotional.verse_reference}\n`;
      msg += `• Fallback Otomatis: ${devotional.is_fallback_eligible ? 'Eligible ✅' : 'Non-Eligible ⚠️'}\n`;
      msg += `• Jadwal Siaran: 09:45 WIB\n\n`;
    } else {
      msg += `• Belum ada renungan hari ini.\n\n`;
    }
  }

  if (role === 'superadmin' || role === 'logistik') {
    msg += `🎂 BIRTHDAY AUTOMATION:\n`;
    msg += `• Ulang tahun hari ini: ${bdayMembers.length} anggota\n`;
    if (bdayMembers.length > 0) {
      msg += `• Penerima: ${bdayMembers.map((m) => m.full_name).join(', ')}\n`;
    }
    msg += `• Jadwal Otomatis: 07:00 WIB (Setiap Hari)\n\n`;
  }

  msg += `🤖 Bot Status: Connected & Broadcast-Only in Groups.`;
  return msg;
}
