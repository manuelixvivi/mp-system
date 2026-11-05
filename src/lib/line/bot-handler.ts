import {
  getProfileByLineUserId,
  getProfileByLineUserIdAsync,
  activateProfileByToken,
  addActivityLog,
  getDevotionalByDate,
  getMembers,
  createMember,
  updateMember,
  getLineGroups,
  getAutomationSettings,
  updateDevotionalAudit,
  addDelivery,
  ensureLineGroupTracked,
  getProfiles,
} from '../db/store';
import { LineApiClient } from './client';
import { UserRole, LineGroup, Member, Profile } from '@/types';
import { getWibParts, getWibIsoDate } from '../time';
import { parseRegistrationText } from './registration-helper';
import { uploadPhotoToDriveOrLocal } from '../drive/client';
import { triageMemberMessage } from '../ai/triage-helper';

// Pending confirmation memory store for personal chat sessions
interface PendingAction {
  userId: string;
  action: 'broadcast_devotional' | 'broadcast_birthday';
  targetGroupIds?: string[];
  expiresAt: number;
}

const pendingActions = new Map<string, PendingAction>();

// Pending member self-registration store
interface PendingMemberRegistration {
  lineUserId: string;
  fullName: string;
  baptismalName?: string;
  lineId?: string;
  instagram?: string;
  classOrigin?: string;
  entryYear?: number;
  birthDate: number;
  birthMonth: number;
  birthYear?: number;
  whatsapp?: string;
  photoUrl?: string;
  matchedMemberId?: string; // Pre-approved whitelist member ID in database
  step: 'awaiting_photo' | 'awaiting_confirmation';
  expiresAt: number;
}

const pendingMemberRegistrations = new Map<string, PendingMemberRegistration>();

/**
 * Main Webhook Event Router for LINE Messaging API
 */
export async function handleLineWebhookEvent(event: any) {
  const lineClient = new LineApiClient();

  // RULE 1: GROUP CHAT HANDLING
  // The bot NEVER responds to general chatting in groups!
  if (event.source?.type === 'group' || event.source?.type === 'room') {
    const groupId = event.source.groupId || event.source.roomId;

    if (event.type === 'join') {
      try {
        const groupSummary = await lineClient.getGroupSummary(groupId);
        const groupName = groupSummary?.groupName || 'LINE Group';
        await ensureLineGroupTracked(groupId, groupName);

        addActivityLog({
          actor_type: 'line_bot',
          action: 'group_join',
          entity_type: 'line_group',
          entity_id: groupId,
          details: { groupName },
        });
      } catch (err: any) {
        console.warn('[LINE WEBHOOK] Error processing group join:', err.message);
      }
    }

    // Auto-Harvesting: capture member LINE User ID if not linked yet
    const groupSenderUserId = event.source.userId;
    if (groupSenderUserId && groupId) {
      try {
        const allMembers = await getMembers();
        const unlinked = allMembers.filter((m) => !m.line_user_id || m.line_user_id.trim().length === 0);
        if (unlinked.length > 0) {
          const memberProfile = await lineClient.getGroupMemberProfile(groupId, groupSenderUserId);
          if (memberProfile?.displayName) {
            const dispLower = memberProfile.displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
            const match = unlinked.find((m) => {
              const fullClean = (m.full_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              const nickClean = (m.nickname || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              const lineIdClean = (m.line_id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              return (
                (fullClean.length >= 3 && dispLower.includes(fullClean)) ||
                (nickClean.length >= 3 && dispLower.includes(nickClean)) ||
                (lineIdClean.length >= 3 && dispLower.includes(lineIdClean))
              );
            });
            if (match) {
              await updateMember(match.id, { line_user_id: groupSenderUserId });
              console.log(
                `[AUTO-HARVEST] Auto-linked member "${match.full_name}" to LINE User ID: ${groupSenderUserId}`
              );
            }
          }
        }
      } catch (err: any) {
        console.warn('[AUTO-HARVEST] Background harvest warning:', err.message);
      }
    }

    // DO NOT RESPOND TO ANY MESSAGES IN GROUPS
    return { status: 'ignored_group_message' };
  }

  // RULE 2: PERSONAL 1-ON-1 CHAT HANDLING
  if (event.source?.type !== 'user' || event.type !== 'message') {
    return { status: 'ignored_non_personal_message_event' };
  }

  const lineUserId = event.source.userId;
  const replyToken = event.replyToken;

  // 1. Handle Image Upload (during registration)
  if (event.message?.type === 'image') {
    const pending = pendingMemberRegistrations.get(lineUserId);
    if (!pending) {
      if (replyToken) {
        await lineClient.replyMessage(replyToken, [
          {
            type: 'text',
            text: '📸 Foto Anda diterima. Untuk melakukan pendaftaran anggota baru, silakan kirim data diri Anda terlebih dahulu dengan format ?registrasi.',
          },
        ]);
      }
      return { status: 'ignored_unregistered_image' };
    }

    const imageBuffer = await lineClient.getMessageContent(event.message.id);
    if (!imageBuffer) {
      if (replyToken) {
        await lineClient.replyMessage(replyToken, [
          {
            type: 'text',
            text: '⚠️ Maaf, gagal mengunduh foto dari server LINE. Silakan coba kirim ulang foto Anda.',
          },
        ]);
      }
      return { status: 'image_download_failed' };
    }

    // Upload to Cloudinary in Full HD (Uncompressed, No Blur)
    const uploadResult = await uploadPhotoToDriveOrLocal(
      `member_${lineUserId}_${Date.now()}.jpg`,
      'image/jpeg',
      imageBuffer
    );

    pending.photoUrl = uploadResult.url;
    pending.step = 'awaiting_confirmation';
    pendingMemberRegistrations.set(lineUserId, pending);

    // Send LINE Flex Message Confirmation Card
    const flexMessage = LineApiClient.buildRegistrationConfirmationFlex({
      fullName: pending.fullName,
      baptismalName: pending.baptismalName,
      lineId: pending.lineId,
      instagram: pending.instagram,
      classOrigin: pending.classOrigin,
      entryYear: pending.entryYear,
      birthDate: pending.birthDate,
      birthMonth: pending.birthMonth,
      birthYear: pending.birthYear,
      whatsapp: pending.whatsapp,
      photoUrl: uploadResult.url,
    });

    if (replyToken) {
      await lineClient.replyMessage(replyToken, [flexMessage]);
    }

    return { status: 'sent_registration_confirmation_flex', lineUserId, photoUrl: uploadResult.url };
  }

  // Text message processing
  if (event.message?.type !== 'text') {
    return { status: 'ignored_non_text_message' };
  }

  const rawText = (event.message.text || '').trim();
  const lowerText = rawText.toLowerCase();

  // Helper response
  const sendReply = async (text: string) => {
    if (replyToken) {
      await lineClient.replyMessage(replyToken, [{ type: 'text', text }]);
    }
    return { status: 'replied', text };
  };

  // Fetch current database records for user identity
  const allMembers = await getMembers();
  const allProfiles = await getProfiles();
  const existingMember = allMembers.find((m) => m.line_user_id === lineUserId);
  const userProfile = (await getProfileByLineUserIdAsync(lineUserId)) || getProfileByLineUserId(lineUserId);

  const isOfficer =
    Boolean(userProfile && userProfile.is_active) ||
    Boolean(existingMember && existingMember.community_role && existingMember.community_role !== 'anggota_aktif');

  // ==========================================
  // A. SELF-REGISTRATION COMMAND (?registrasi or /registrasi or #registrasi)
  // ==========================================
  if (
    lowerText.includes('registrasi') &&
    !lowerText.includes('registrasi_akun') &&
    (rawText.startsWith('?') || rawText.startsWith('/') || rawText.startsWith('#'))
  ) {
    // 1. Prevent Double Registration: check if this LINE User ID is already verified
    if (existingMember && existingMember.line_verification_status === 'verified') {
      return await sendReply(
        `Halo ${existingMember.full_name}! 👋✨\n\nAkun LINE kamu sudah terdaftar dan terverifikasi di sistem database MP Community.\n\n⚠️ Pendaftaran anggota hanya dapat dilakukan 1 kali. Jika ada pembaruan data (misal ganti nomor WhatsApp, foto, atau asal kelas), kamu bisa langsung menghubungi pengurus atau Superadmin ya. Terima kasih banyak! 😊🙏`
      );
    }

    // 2. Parse text fields
    const parsed = parseRegistrationText(rawText);
    if (!parsed) {
      const formatGuide = `⚠️ FORMAT REGISTRASI TIDAK LENGKAP\n\nSilakan salin dan lengkapi format pendaftaran berikut:\n\n?registrasi\nNama Lengkap : [Nama Lengkap Anda]\nNama Baptis : [Nama Baptis atau -]\nIDLine : [ID LINE Anda]\nInstagram : [Akun IG]\nKelas : [Asal Kelas]\nTahun Masuk : [Tahun Masuk / Angkatan]\nTanggal lahir : [Contoh: 05 November 2004]\nNomor Whatsapp : [08123456789]`;
      return await sendReply(formatGuide);
    }

    // 3. Whitelist Pre-approved Verification: Check if candidate was pre-entered by admin
    const inputNameClean = parsed.fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const inputClassClean = (parsed.classOrigin || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const matchedCandidate = allMembers.find((m) => {
      // Must not be already claimed by another LINE user
      if (m.line_verification_status === 'verified') return false;

      const mNameClean = (m.full_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const mNickClean = (m.nickname || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const mClassClean = (m.class_origin || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      // Name must match (either full name includes or is included)
      const nameMatch =
        mNameClean.length >= 3 &&
        (mNameClean.includes(inputNameClean) ||
          inputNameClean.includes(mNameClean) ||
          (mNickClean.length >= 3 && inputNameClean.includes(mNickClean)));

      // Class match if specified in pre-approved record
      const classMatch =
        !mClassClean ||
        !inputClassClean ||
        mClassClean.includes(inputClassClean) ||
        inputClassClean.includes(mClassClean);

      return nameMatch && classMatch;
    });

    if (!matchedCandidate) {
      return await sendReply(
        `Halo ${parsed.fullName}! Maaf ya, nama atau asal kelas kamu (${parsed.classOrigin || '-'}) belum terdaftar dalam daftar calon anggota yang diizinkan untuk registrasi di MP Community.\n\nPastikan penulisan nama dan asal kelasmu sesuai dengan yang telah dicatat pengurus ya. Jika kamu adalah anggota baru, silakan hubungi pengurus atau Superadmin terlebih dahulu agar datamu dimasukkan ke daftar anggota yang berhak registrasi. Semangat dan Tuhan memberkati! 🙏✨`
      );
    }

    // Store in pending registration
    pendingMemberRegistrations.set(lineUserId, {
      ...parsed,
      matchedMemberId: matchedCandidate.id,
      lineUserId,
      step: 'awaiting_photo',
      expiresAt: Date.now() + 1800000, // 30 minutes
    });

    const reply = `📋 DATA PENDAFTARAN DICATAT!\n\nHalo ${matchedCandidate.full_name}! Data kamu berhasil dicocokkan dengan daftar calon anggota MP Community (${matchedCandidate.class_origin || parsed.classOrigin || 'Komunitas'}).\n\n📸 LANGKAH TERAKHIR:\nSilakan kirimkan 1 FOTO DIRI ANDA (pasfoto/foto formal) di obrolan ini sebagai lampiran profil keanggotaan.\n\nFoto Anda akan diunggah aman dalam kualitas Full HD (asli tanpa kompresi) ke Cloudinary MP Community.`;
    return await sendReply(reply);
  }

  // ==========================================
  // B. CONFIRMATION / CANCELLATION OF REGISTRATION
  // ==========================================
  if (lowerText === '/konfirmasi_reg' || lowerText === '?konfirmasi_reg' || lowerText === '#konfirmasi_reg') {
    const pending = pendingMemberRegistrations.get(lineUserId);
    if (!pending || !pending.photoUrl) {
      return await sendReply(
        '⚠️ Tidak ada data pendaftaran yang siap dikonfirmasi atau Anda belum mengunggah foto. Silakan ketik ?registrasi untuk memulai pendaftaran baru.'
      );
    }

    let memberId = pending.matchedMemberId;
    if (memberId) {
      // Update existing pre-approved member record
      await updateMember(memberId, {
        full_name: pending.fullName,
        baptismal_name: pending.baptismalName,
        line_id: pending.lineId,
        line_user_id: lineUserId,
        instagram_account: pending.instagram,
        class_origin: pending.classOrigin,
        entry_year: pending.entryYear,
        birth_date: pending.birthDate,
        birth_month: pending.birthMonth,
        birth_year: pending.birthYear,
        whatsapp_number: pending.whatsapp,
        photo_url: pending.photoUrl,
        community_role: 'anggota_aktif',
        status: 'active',
        line_verification_status: 'verified',
      });
    } else {
      const created = await createMember({
        full_name: pending.fullName,
        baptismal_name: pending.baptismalName,
        line_id: pending.lineId,
        line_user_id: lineUserId,
        instagram_account: pending.instagram,
        class_origin: pending.classOrigin,
        entry_year: pending.entryYear,
        birth_date: pending.birthDate,
        birth_month: pending.birthMonth,
        birth_year: pending.birthYear,
        whatsapp_number: pending.whatsapp,
        photo_url: pending.photoUrl,
        community_role: 'anggota_aktif',
        status: 'active',
        line_verification_status: 'verified',
      });
      memberId = created.id;
    }

    pendingMemberRegistrations.delete(lineUserId);

    const settings = await getAutomationSettings();
    const allGroups = await getLineGroups();
    const defaultGroup = allGroups.find((g) => g.is_active);
    const groupLink =
      (settings as any).group_invite_link ||
      (defaultGroup ? `https://line.me/R/ti/g/${defaultGroup.group_id}` : 'https://line.me/ti/g/mp_community_official');

    const welcomeMsg = `🎉 SELAMAT BERGABUNG DI MP COMMUNITY! ✝️\n\nHalo ${pending.fullName}!\nData pendaftaran Anda telah resmi terverifikasi dan tersimpan dalam sistem database MP Community.\n\nFoto Anda telah tersimpan aman di Cloudinary (Full HD).\n\n👥 TAUTAN GRUP LINE:\nSilakan klik tautan di bawah ini untuk langsung bergabung ke Grup LINE Komunitas MP:\n👉 ${groupLink}\n\nSampai jumpa di kegiatan komunitas dan Tuhan memberkati! 🙏✨`;
    return await sendReply(welcomeMsg);
  }

  if (lowerText === '/batal_reg' || lowerText === '?batal_reg' || lowerText === '#batal_reg') {
    pendingMemberRegistrations.delete(lineUserId);
    return await sendReply('❌ Pendaftaran dibatalkan. Anda dapat mengirimkan ulang format ?registrasi kapan saja.');
  }

  // ==========================================
  // C. STAFF TOKEN ACTIVATION (/registrasi_akun or #registrasi_akun)
  // ==========================================
  const matchReg = rawText.match(/^[#/?]registrasi_akun(?:\s+([A-Za-z0-9_-]+))?$/i);
  if (matchReg) {
    const token = (matchReg[1] || '').trim().toUpperCase();
    if (!token) {
      return await sendReply(
        '⚠️ FORMAT REGISTRASI TIDAK LENGKAP\n\nUntuk mengaktivasi akun petugas, gunakan format:\n#registrasi_akun <TOKEN>\nContoh: #registrasi_akun ABEL123'
      );
    }

    const activation = await activateProfileByToken(token, lineUserId);
    if (!activation.success || !activation.profile) {
      return await sendReply(
        `⚠️ GAGAL AKTIVASI AKUN\n\n${activation.error || 'Token tidak valid.'}\n\nPastikan format token sudah sesuai dengan yang diberikan oleh Superadmin.`
      );
    }

    const prof = activation.profile;
    const roleLabels: Record<string, string> = {
      superadmin: 'Superadmin (Akses Penuh)',
      liturgi: 'Tim Liturgi (Audit & Renungan)',
      logistik: 'Tim Logistik (Anggota & Ulang Tahun)',
      pubdok: 'Tim Pubdok (Editor Desain & Kartu Ultah)',
    };

    return await sendReply(
      `🎉 REGISTRASI AKUN PETUGAS BERHASIL!\n\nHalo ${prof.name}! Akun petugas Anda telah resmi diaktivasi.\n\n👤 Nama Petugas: ${prof.name}\n🛡️ Hak Akses: ${roleLabels[prof.role] || prof.role}\n📱 LINE User ID: ${lineUserId}\n\n💡 Perintah Bot Petugas (awali dengan #):\n• #menu — Tampilkan menu aksi\n• #status — Cek status otomatisasi hari ini\n• #help — Bantuan perintah bot`
    );
  }

  // ==========================================
  // D. LINE USER ID INQUIRY (?id, #id, /myid)
  // ==========================================
  if (lowerText === '?id' || lowerText === '#id' || lowerText === '/myid' || lowerText === '/id') {
    return await sendReply(
      `🆔 LINE USER ID ANDA:\n\n${lineUserId}\n\n💡 Salin ID di atas dan masukkan ke data anggota agar bot dapat melakukan mention/tag otomatis saat ulang tahun.`
    );
  }

  // ==========================================
  // E. SECURITY PREFIX VALIDATION & COMMAND DISPATCH
  // ==========================================

  // E.1. OFFICER COMMANDS (MUST START WITH '#')
  if (rawText.startsWith('#')) {
    if (!isOfficer) {
      return await sendReply(
        "Halo! Perintah dengan awalan tanda '#' dikhususkan untuk pengurus/petugas MP Community. Jika kamu ingin bertanya atau mendaftar anggota, silakan gunakan awalan tanda tanya '?' ya (contoh: ?registrasi atau ?tanya). Terima kasih! 🙏✨"
      );
    }

    const cleanCommand = rawText.slice(1).trim().toLowerCase();
    const todayIso = getWibIsoDate();

    // Check recognized officer commands
    if (cleanCommand === 'menu') {
      return await sendReply(getMenuMessage(userProfile?.role || 'liturgi', userProfile?.name || 'Petugas'));
    }

    if (cleanCommand === 'help') {
      return await sendReply(getHelpMessage(userProfile?.role || 'liturgi', userProfile?.name || 'Petugas'));
    }

    if (cleanCommand === 'status' || cleanCommand.startsWith('status ')) {
      return await sendReply(await getStatusMessage(userProfile?.role || 'liturgi', todayIso));
    }

    if (cleanCommand === 'get_all_groupid') {
      if (userProfile?.role !== 'superadmin') {
        return await sendReply('⛔ Akses Ditolak: Perintah #get_all_groupid hanya dapat digunakan oleh Superadmin.');
      }
      const allGroups = await getLineGroups();
      return await sendReply(formatGroupListMessage(allGroups));
    }

    if (cleanCommand === 'approve' || cleanCommand.startsWith('approve ')) {
      if (userProfile?.role !== 'superadmin' && userProfile?.role !== 'liturgi') {
        return await sendReply('⛔ Akses Ditolak: Hanya Tim Liturgi & Superadmin yang berwenang menyetujui renungan.');
      }
      const devotional = await getDevotionalByDate(todayIso);
      if (!devotional) return await sendReply(`⚠️ Renungan hari ini (${todayIso}) belum tersedia dalam sistem.`);
      await updateDevotionalAudit(devotional.id, 'approved', userProfile?.name || 'Liturgi', 'Approved via LINE');
      return await sendReply(`✅ BERHASIL: Renungan hari ini (${todayIso}) telah disetujui (Approved). Siap dikirim pada 09:45 WIB.`);
    }

    if (cleanCommand === 'reject' || cleanCommand.startsWith('reject ')) {
      if (userProfile?.role !== 'superadmin' && userProfile?.role !== 'liturgi') {
        return await sendReply('⛔ Akses Ditolak: Hanya Tim Liturgi & Superadmin yang berwenang menolak renungan.');
      }
      const devotional = await getDevotionalByDate(todayIso);
      if (!devotional) return await sendReply(`⚠️ Renungan hari ini (${todayIso}) belum tersedia dalam sistem.`);
      await updateDevotionalAudit(devotional.id, 'rejected', userProfile?.name || 'Liturgi', 'Rejected via LINE');
      return await sendReply(`❌ PERINGATAN: Renungan hari ini (${todayIso}) telah DITOLAK. Broadcast 09:45 WIB TIDAK AKAN DIKIRIM.`);
    }

    if (cleanCommand === 'broadcast' || cleanCommand === 'broadcast devotional' || cleanCommand === 'broadcast renungan') {
      if (userProfile?.role !== 'superadmin' && userProfile?.role !== 'liturgi') {
        return await sendReply('⛔ Akses Ditolak: Anda tidak memiliki wewenang untuk broadcast renungan.');
      }
      const devotional = await getDevotionalByDate(todayIso);
      if (!devotional) return await sendReply('⚠️ Renungan hari ini belum tersedia.');

      pendingActions.set(lineUserId, {
        userId: lineUserId,
        action: 'broadcast_devotional',
        expiresAt: Date.now() + 300000,
      });

      return await sendReply(
        `⚠️ KONFIRMASI SIARAN RENUNGAN\n\nAnda akan memicu siaran renungan harian secara manual sekarang.\n\nKetik #konfirmasi untuk mengirim sekarang atau #batal untuk membatalkan.`
      );
    }

    if (cleanCommand === 'konfirmasi') {
      const pending = pendingActions.get(lineUserId);
      if (!pending || Date.now() > pending.expiresAt) {
        return await sendReply('⚠️ Tidak ada aksi yang menunggu konfirmasi atau sesi konfirmasi telah kedaluwarsa.');
      }
      pendingActions.delete(lineUserId);
      // Trigger broadcast
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cron/devotional-broadcast`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET || 'mp_control_secret_dev'}` },
      });
      const data = await res.json().catch(() => ({}));
      return await sendReply(`🚀 Eksekusi selesai: ${data.message || 'Siaran renungan diproses.'}`);
    }

    if (cleanCommand === 'batal') {
      pendingActions.delete(lineUserId);
      return await sendReply('❌ Aksi dibatalkan.');
    }

    // Unrecognized officer command: respond with natural human-like message
    return await sendReply(
      `Halo Kak! Maaf ya, perintah #${cleanCommand} tidak dikenali dalam sistem petugas. Coba ketik #menu atau #help untuk melihat daftar perintah resmi yang tersedia ya Kak. Terima kasih! 🙏✨`
    );
  }

  // E.2. REGULAR USER / MEMBER INQUIRIES (MUST START WITH '?')
  if (rawText.startsWith('?')) {
    const questionText = rawText.slice(1).trim();

    if (!questionText) {
      return await sendReply(
        "Halo! Kamu mengirim tanda tanya '?'. Ada yang bisa kami bantu seputar komunitas MP? Silakan ketik pertanyaanmu setelah tanda tanya (contoh: ?kapan ada misa bersama atau ?info ulang tahun). Terima kasih! 😊🙏"
      );
    }

    // CHECK DATABASE: User must be a registered member or user in database!
    // "Bot jangan merespon apa-apa jika... diluar user terdaftar didatabase"
    const registeredSender = existingMember || allMembers.find((m) => m.line_user_id === lineUserId);
    if (!registeredSender && !userProfile) {
      // SILENT: Do not respond to unregistered users!
      return { status: 'ignored_unregistered_user' };
    }

    // Run Intelligent LLM Triage
    const officerMembers = allMembers.filter((m) => m.community_role && m.community_role !== 'anggota_aktif');
    const triageResult = await triageMemberMessage(
      questionText,
      registeredSender || { full_name: userProfile!.name } as Member,
      officerMembers,
      allProfiles
    );

    // If outside religious organization: DO NOT RESPOND
    // "Bot jangan merespon apa-apa jika ditanya terkait diluar Organisasi keagamaan itu sendiri"
    if (!triageResult || !triageResult.isRelevant) {
      return { status: 'ignored_out_of_scope_inquiry' };
    }

    // Reply to member with division & coordinator info
    await sendReply(triageResult.replyMessage);

    // Forward member's question to the designated officer's LINE User ID if available
    if (triageResult.coordinatorLineUserId && triageResult.coordinatorLineUserId !== lineUserId) {
      try {
        await lineClient.pushMessage(triageResult.coordinatorLineUserId, [
          {
            type: 'text',
            text: triageResult.summaryForOfficer,
          },
        ]);
        console.log(`[TRIAGE FORWARD] Forwarded inquiry to ${triageResult.coordinatorName} (${triageResult.coordinatorLineUserId})`);
      } catch (fwdErr: any) {
        console.warn('[TRIAGE FORWARD ERROR]:', fwdErr.message);
      }
    }

    return { status: 'replied_triage_routing', division: triageResult.division };
  }

  // E.3. NO VALID PREFIX PROVIDED (NOT STARTING WITH '#' OR '?')
  return await sendReply(
    "Halo! Untuk berinteraksi atau bertanya ke bot MP Community, mohon awali pesanmu dengan tanda tanya '?' untuk anggota (contoh: ?registrasi atau ?tanya seputar renungan) atau tanda '#' untuk pengurus (contoh: #menu). Terima kasih banyak ya! 😊🙏"
  );
}

// ==========================================
// FORMATTERS & TEMPLATES
// ==========================================
function getMenuMessage(role: UserRole, name: string): string {
  return `🤖 MENU PETUGAS MP CONTROL SYSTEM\nHalo, ${name}!\n\n💡 Perintah Tersedia (Awali dengan #):\n• #status — Cek status otomatisasi hari ini\n• #help — Panduan lengkap perintah\n• #approve — Setujui renungan harian\n• #reject — Tolak renungan harian\n• #broadcast — Memicu siaran manual ke grup`;
}

function getHelpMessage(role: UserRole, name: string): string {
  return `📖 BANTUAN PERINTAH PETUGAS MP\n\nSemua perintah pengurus wajib diawali tanda '#':\n\n• #status — Pantau status siaran renungan & ultah\n• #approve — Setujui draft renungan sebelum 09:45 WIB\n• #reject — Tolak siaran renungan\n• #broadcast — Kirim renungan ke grup sekarang\n• #id — Cek LINE User ID Anda\n\nUntuk anggota umum, seluruh pesan wajib diawali '?'.`;
}

function formatGroupListMessage(groups: LineGroup[]): string {
  if (groups.length === 0) return 'Belum ada grup yang tersimpan.';
  return `📋 DAFTAR GRUP LINE:\n\n` + groups.map((g, i) => `${i + 1}. ${g.group_name}\nID: ${g.group_id}`).join('\n\n');
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
