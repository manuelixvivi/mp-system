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
  fullName?: string;
  baptismalName?: string;
  lineId?: string;
  instagram?: string;
  classOrigin?: string;
  entryYear?: number;
  birthDate?: number;
  birthMonth?: number;
  birthYear?: number;
  whatsapp?: string;
  photoUrl?: string;
  matchedMemberId?: string; // Pre-approved whitelist member ID in database
  step:
    | 'awaiting_name'
    | 'awaiting_baptismal'
    | 'awaiting_line_id'
    | 'awaiting_instagram'
    | 'awaiting_class'
    | 'awaiting_entry_year'
    | 'awaiting_birth_date'
    | 'awaiting_whatsapp'
    | 'awaiting_photo'
    | 'awaiting_confirmation';
  expiresAt: number;
}

const pendingMemberRegistrations = new Map<string, PendingMemberRegistration>();

const MONTH_MAP_REG: Record<string, number> = {
  januari: 1, jan: 1, january: 1,
  februari: 2, feb: 2, february: 2,
  maret: 3, mar: 3, march: 3,
  april: 4, apr: 4,
  mei: 5, may: 5,
  juni: 6, jun: 6, june: 6,
  juli: 7, jul: 7, july: 7,
  agustus: 8, agt: 8, agu: 8, august: 8,
  september: 9, sep: 9, sept: 9,
  oktober: 10, okt: 10, october: 10,
  november: 11, nov: 11,
  desember: 12, des: 12, december: 12,
};

function parseBirthDateInput(value: string): { day: number; month: number; year?: number } {
  let birthDate = 1;
  let birthMonth = 1;
  let birthYear: number | undefined;

  const dateParts = value.match(/^(\d{1,2})[\s\-/.]([A-Za-z]+|\d{1,2})(?:[\s\-/.](19\d{2}|20\d{2}))?$/);
  if (dateParts) {
    birthDate = parseInt(dateParts[1], 10);
    const rawM = dateParts[2].toLowerCase();
    if (MONTH_MAP_REG[rawM]) {
      birthMonth = MONTH_MAP_REG[rawM];
    } else if (!isNaN(parseInt(rawM, 10))) {
      birthMonth = parseInt(rawM, 10);
    }
    if (dateParts[3]) {
      birthYear = parseInt(dateParts[3], 10);
    }
  } else {
    const dayM = value.match(/\b([1-9]|[12]\d|3[01])\b/);
    if (dayM) birthDate = parseInt(dayM[1], 10);
    for (const [mName, mNum] of Object.entries(MONTH_MAP_REG)) {
      if (value.toLowerCase().includes(mName)) {
        birthMonth = mNum;
        break;
      }
    }
    const yM = value.match(/\b(19\d{2}|20\d{2})\b/);
    if (yM) birthYear = parseInt(yM[1], 10);
  }

  return {
    day: Math.min(Math.max(birthDate, 1), 31),
    month: Math.min(Math.max(birthMonth, 1), 12),
    year: birthYear,
  };
}

async function finalizeRegistration(
  pending: PendingMemberRegistration,
  lineUserId: string,
  sendReply: (text: string) => Promise<any>
) {
  let memberId = pending.matchedMemberId;
  const birthDate = pending.birthDate || 1;
  const birthMonth = pending.birthMonth || 1;

  if (memberId) {
    await updateMember(memberId, {
      full_name: pending.fullName || 'Member',
      baptismal_name: pending.baptismalName,
      line_id: pending.lineId,
      line_user_id: lineUserId,
      instagram_account: pending.instagram,
      class_origin: pending.classOrigin,
      entry_year: pending.entryYear,
      birth_date: birthDate,
      birth_month: birthMonth,
      birth_year: pending.birthYear,
      whatsapp_number: pending.whatsapp,
      photo_url: pending.photoUrl,
      community_role: 'anggota_aktif',
      status: 'active',
      line_verification_status: 'verified',
    });
  } else {
    const created = await createMember({
      full_name: pending.fullName || 'Member',
      baptismal_name: pending.baptismalName,
      line_id: pending.lineId,
      line_user_id: lineUserId,
      instagram_account: pending.instagram,
      class_origin: pending.classOrigin,
      entry_year: pending.entryYear,
      birth_date: birthDate,
      birth_month: birthMonth,
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
  const groupLink =
    (settings as any).group_invite_link ||
    'https://line.me/R/ti/g/Lptzr-3e_p';

  const welcomeMsg = `🎉 SELAMAT BERGABUNG DI MP COMMUNITY! ✝️\n\nHalo ${pending.fullName}!\nData pendaftaran Anda telah resmi terverifikasi dan tersimpan dalam sistem database MP Community.\n\nFoto Anda telah tersimpan aman di Cloudinary (Full HD).\n\n👥 TAUTAN GRUP LINE:\nSilakan klik tautan di bawah ini untuk langsung bergabung ke Grup LINE Komunitas MP:\n👉 ${groupLink}\n\nSampai jumpa di kegiatan komunitas dan Tuhan memberkati! 🙏✨`;
  return await sendReply(welcomeMsg);
}

// Pending photo update store for active members
interface PendingPhotoUpdate {
  memberId: string;
  fullName: string;
  classOrigin?: string;
  expiresAt: number;
}

const pendingPhotoUpdates = new Map<string, PendingPhotoUpdate>();

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

  // 1. Handle Image Upload (Registration or Photo Update for Active Members)
  if (event.message?.type === 'image') {
    const pendingReg = pendingMemberRegistrations.get(lineUserId);
    const pendingPhoto = pendingPhotoUpdates.get(lineUserId);
    const isActiveMember = Boolean(existingMember && existingMember.status === 'active');

    if (!pendingReg && !pendingPhoto && !isActiveMember) {
      return await sendReply(
        '📸 Foto Anda diterima. Untuk melakukan pendaftaran anggota baru, silakan kirim data diri Anda terlebih dahulu dengan format ?registrasi.'
      );
    }

    const imageBuffer = await lineClient.getMessageContent(event.message.id);
    if (!imageBuffer) {
      return await sendReply(
        '⚠️ Maaf, gagal mengunduh foto dari server LINE. Silakan coba kirim ulang foto Anda.'
      );
    }

    // CASE A: NEW MEMBER REGISTRATION (Saved as "Nama - Kelas")
    if (pendingReg) {
      if (pendingReg.step !== 'awaiting_photo' && pendingReg.step !== 'awaiting_confirmation') {
        return await sendReply(
          '📸 Foto Anda diterima, tetapi mohon selesaikan pengisian data teks terlebih dahulu ya.'
        );
      }

      const cleanName = (pendingReg.fullName || 'Member').trim().replace(/[/\\?%*:|"<>]/g, '');
      const cleanClass = (pendingReg.classOrigin || 'Umum').trim().replace(/[/\\?%*:|"<>]/g, '');
      const publicId = `${cleanName} - ${cleanClass}`;

      const uploadResult = await uploadPhotoToDriveOrLocal(
        `${publicId}.jpg`,
        'image/jpeg',
        imageBuffer,
        { customPublicId: publicId }
      );

      pendingReg.photoUrl = uploadResult.url;
      pendingReg.step = 'awaiting_confirmation';
      pendingMemberRegistrations.set(lineUserId, pendingReg);

      const flexMessage = LineApiClient.buildRegistrationConfirmationFlex({
        fullName: pendingReg.fullName || cleanName,
        baptismalName: pendingReg.baptismalName,
        lineId: pendingReg.lineId,
        instagram: pendingReg.instagram,
        classOrigin: pendingReg.classOrigin,
        entryYear: pendingReg.entryYear,
        birthDate: pendingReg.birthDate || 1,
        birthMonth: pendingReg.birthMonth || 1,
        birthYear: pendingReg.birthYear,
        whatsapp: pendingReg.whatsapp,
        photoUrl: uploadResult.url,
      });

      if (replyToken) {
        await lineClient.replyMessage(replyToken, [
          flexMessage,
          {
            type: 'text',
            text: '👆 Silakan periksa kartu data pendaftaran di atas.\n\nKetik "konfirmasi" untuk menyelesaikan pendaftaran, atau ketik "batal" jika ingin mengulang.',
          },
        ]);
      }

      return { status: 'sent_registration_confirmation_flex', lineUserId, photoUrl: uploadResult.url, publicId };
    }

    // CASE B: REGISTERED ACTIVE MEMBER UPDATING PHOTO (Saved as "Nama - Kelas")
    if (existingMember && existingMember.status === 'active') {
      const cleanName = existingMember.full_name.trim().replace(/[/\\?%*:|"<>]/g, '');
      const cleanClass = (existingMember.class_origin || 'Umum').trim().replace(/[/\\?%*:|"<>]/g, '');
      const publicId = `${cleanName} - ${cleanClass}`;

      const uploadResult = await uploadPhotoToDriveOrLocal(
        `${publicId}.jpg`,
        'image/jpeg',
        imageBuffer,
        { customPublicId: publicId }
      );

      await updateMember(existingMember.id, { photo_url: uploadResult.url });
      existingMember.photo_url = uploadResult.url;
      pendingPhotoUpdates.delete(lineUserId);

      const profileFlex = LineApiClient.buildMemberProfileFlex({
        fullName: existingMember.full_name,
        baptismalName: existingMember.baptismal_name,
        lineId: existingMember.line_id,
        instagram: existingMember.instagram_account,
        classOrigin: existingMember.class_origin,
        entryYear: existingMember.entry_year,
        birthDate: existingMember.birth_date,
        birthMonth: existingMember.birth_month,
        birthYear: existingMember.birth_year,
        whatsapp: existingMember.whatsapp_number,
        photoUrl: uploadResult.url,
        role: existingMember.community_role,
      });

      if (replyToken) {
        await lineClient.replyMessage(replyToken, [
          {
            type: 'text',
            text: `🎉 FOTO PROFIL BERHASIL DIPERBARUI!\n\nHalo ${existingMember.full_name}! Foto profil kamu telah berhasil disimpan di Cloudinary (Full HD) dengan format nama:\n"${publicId}".\n\nBerikut kartu profil terbarumu:`,
          },
          profileFlex,
        ]);
      }

      // NOTIFY PUBDOK COORDINATOR (User Request: "Kalau ada update atau pembaharuan foto orang yang sudah terdaftar langsung infokan ke koordinator pubdok. Tapi kalau user baru ga perlu kasih tau.")
      try {
        const pubdokMember = allMembers.find(
          (m) => m.community_role === 'pubdok' && m.line_user_id && m.line_user_id.trim().startsWith('U')
        );
        const pubdokProfile = allProfiles.find(
          (p) => p.role === 'pubdok' && p.is_active && p.line_user_id && p.line_user_id.trim().startsWith('U')
        );
        const pubdokUserId = pubdokMember?.line_user_id || pubdokProfile?.line_user_id;
        const pubdokName = pubdokMember?.full_name || pubdokProfile?.name || 'Tim Pubdok';

        if (pubdokUserId && pubdokUserId !== lineUserId) {
          const pubdokNotice = `📢 INFO PEMBARUAN FOTO ANGGOTA (PUBDOK)\n\nHalo ${pubdokName}! 👋\n\nAnggota terdaftar berikut baru saja memperbarui foto profilnya di sistem:\n\n👤 Nama: ${existingMember.full_name}\n🏫 Kelas: ${existingMember.class_origin || '-'}\n📸 Format Cloudinary: "${publicId}"\n🔗 URL: ${uploadResult.url}\n\nFoto terbaru ini siap digunakan untuk keperluan desain & kartu ucapan ulang tahun MP Community.`;
          await lineClient.pushMessage(pubdokUserId, [
            {
              type: 'text',
              text: pubdokNotice,
            },
            {
              type: 'image',
              originalContentUrl: uploadResult.url,
              previewImageUrl: uploadResult.url,
            },
          ]);
          console.log(`[PUBDOK NOTIFY] Successfully notified Pubdok coordinator ${pubdokName} (${pubdokUserId})`);
        }
      } catch (pubdokErr: any) {
        console.warn('[PUBDOK NOTIFY WARNING]:', pubdokErr.message);
      }

      return { status: 'member_photo_updated', memberId: existingMember.id, photoUrl: uploadResult.url, publicId };
    }
  }

  // Text message processing
  if (event.message?.type !== 'text') {
    return { status: 'ignored_non_text_message' };
  }

  const rawText = (event.message.text || '').trim();
  const lowerText = rawText.toLowerCase();

  // ==========================================
  // CANCEL REGISTRATION / ACTION
  // ==========================================
  if (
    lowerText === 'batal' ||
    lowerText === '?batal' ||
    lowerText === '#batal' ||
    lowerText === '/batal' ||
    lowerText === 'batal_reg' ||
    lowerText === '?batal_reg' ||
    lowerText === '/batal_reg' ||
    lowerText === '#batal_reg'
  ) {
    if (pendingMemberRegistrations.has(lineUserId)) {
      pendingMemberRegistrations.delete(lineUserId);
      return await sendReply('❌ Pendaftaran dibatalkan. Kamu dapat memulai kembali kapan saja dengan mengetik "registrasi".');
    }
  }

  // ==========================================
  // STEP-BY-STEP CONVERSATIONAL REGISTRATION WIZARD
  // ==========================================
  const ongoingReg = pendingMemberRegistrations.get(lineUserId);
  if (ongoingReg && ongoingReg.expiresAt > Date.now()) {
    ongoingReg.expiresAt = Date.now() + 1800000;

    // STEP 1: Awaiting Full Name
    if (ongoingReg.step === 'awaiting_name') {
      const inputNameClean = rawText.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (inputNameClean.length < 3) {
        return await sendReply('⚠️ Nama terlalu pendek. Silakan ketik nama lengkap Anda (minimal 3 karakter):');
      }

      const matchedCandidate = allMembers.find((m) => {
        if (m.line_verification_status === 'verified') return false;
        const mNameClean = (m.full_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const mNickClean = (m.nickname || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return (
          mNameClean.length >= 3 &&
          (mNameClean.includes(inputNameClean) ||
            inputNameClean.includes(mNameClean) ||
            (mNickClean.length >= 3 && inputNameClean.includes(mNickClean)))
        );
      });

      if (!matchedCandidate) {
        return await sendReply(
          `Halo ${rawText}! 👋\n\nMaaf ya, nama kamu belum terdaftar dalam daftar calon anggota yang diizinkan untuk registrasi di MP Community.\n\nPastikan penulisan nama lengkapmu sesuai dengan yang telah dicatat pengurus ya. Jika kamu adalah anggota baru, silakan hubungi pengurus atau Superadmin terlebih dahulu agar namamu dimasukkan ke daftar whitelist.\n\n(Ketik ulang namamu jika ada kesalahan eja, atau ketik "batal" untuk membatalkan)`
        );
      }

      ongoingReg.fullName = matchedCandidate.full_name || rawText;
      ongoingReg.matchedMemberId = matchedCandidate.id;
      if (matchedCandidate.class_origin) {
        ongoingReg.classOrigin = matchedCandidate.class_origin;
      }
      ongoingReg.step = 'awaiting_baptismal';
      pendingMemberRegistrations.set(lineUserId, ongoingReg);

      return await sendReply(
        `Halo ${matchedCandidate.full_name}! 👋✨\nData kamu berhasil dicocokkan dengan daftar calon anggota MP Community.\n\nLangkah selanjutnya:\nApa NAMA BAPTIS kamu?\n(Ketik "-" jika belum atau tidak ada)`
      );
    }

    // STEP 2: Awaiting Baptismal Name
    if (ongoingReg.step === 'awaiting_baptismal') {
      ongoingReg.baptismalName = rawText === '-' ? undefined : rawText;
      ongoingReg.step = 'awaiting_line_id';
      pendingMemberRegistrations.set(lineUserId, ongoingReg);

      return await sendReply(
        `Tercatat! 📋\n\nSelanjutnya, apa ID LINE kamu?\n(Ketik "-" jika tidak ada ID khusus)`
      );
    }

    // STEP 3: Awaiting LINE ID
    if (ongoingReg.step === 'awaiting_line_id') {
      ongoingReg.lineId = rawText === '-' ? undefined : rawText.replace(/^@/, '');
      ongoingReg.step = 'awaiting_instagram';
      pendingMemberRegistrations.set(lineUserId, ongoingReg);

      return await sendReply(
        `Sip! 👍\n\nSelanjutnya, apa username / akun INSTAGRAM kamu?\n(Ketik "-" jika tidak ada)`
      );
    }

    // STEP 4: Awaiting Instagram
    if (ongoingReg.step === 'awaiting_instagram') {
      ongoingReg.instagram = rawText === '-' ? undefined : rawText.replace(/^@/, '');
      ongoingReg.step = 'awaiting_class';
      pendingMemberRegistrations.set(lineUserId, ongoingReg);

      const classHint = ongoingReg.classOrigin
        ? `\n(Data dari pengurus: "${ongoingReg.classOrigin}" — ketik "ya" untuk memakai kelas ini, atau ketik nama kelas lain)`
        : '\n(Contoh: PPTI 23 atau PPA 10)';

      return await sendReply(
        `Mantap! 🌟\n\nDari KELAS / ASAL divisi apa kamu?${classHint}`
      );
    }

    // STEP 5: Awaiting Class Origin
    if (ongoingReg.step === 'awaiting_class') {
      if (lowerText === 'ya' && ongoingReg.classOrigin) {
        // Keep pre-filled class
      } else {
        ongoingReg.classOrigin = rawText;
      }
      ongoingReg.step = 'awaiting_entry_year';
      pendingMemberRegistrations.set(lineUserId, ongoingReg);

      return await sendReply(
        `Tercatat (${ongoingReg.classOrigin})! 🏫\n\nTahun berapa TAHUN MASUK / ANGKATAN kamu?\n(Contoh: 2026)`
      );
    }

    // STEP 6: Awaiting Entry Year
    if (ongoingReg.step === 'awaiting_entry_year') {
      const yearMatch = rawText.match(/\b(19\d{2}|20\d{2})\b/);
      ongoingReg.entryYear = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
      ongoingReg.step = 'awaiting_birth_date';
      pendingMemberRegistrations.set(lineUserId, ongoingReg);

      return await sendReply(
        `Oke! 📅\n\nKapan TANGGAL LAHIR kamu? (Penting untuk ucapan ulang tahun komunitas!)\nFormat: Tanggal Bulan Tahun\n(Contoh: 1 Januari 2006 atau 05-11-2004)`
      );
    }

    // STEP 7: Awaiting Birth Date
    if (ongoingReg.step === 'awaiting_birth_date') {
      const { day, month, year } = parseBirthDateInput(rawText);
      ongoingReg.birthDate = day;
      ongoingReg.birthMonth = month;
      ongoingReg.birthYear = year;
      ongoingReg.step = 'awaiting_whatsapp';
      pendingMemberRegistrations.set(lineUserId, ongoingReg);

      return await sendReply(
        `Tercatat (${day}/${month}${year ? `/${year}` : ''})! 🎂\n\nTerakhir untuk data teks, berapa NOMOR WHATSAPP kamu yang aktif?\n(Contoh: 08123456789)`
      );
    }

    // STEP 8: Awaiting WhatsApp
    if (ongoingReg.step === 'awaiting_whatsapp') {
      ongoingReg.whatsapp = rawText;
      ongoingReg.step = 'awaiting_photo';
      pendingMemberRegistrations.set(lineUserId, ongoingReg);

      return await sendReply(
        `Terima kasih! Seluruh data diri kamu sudah tercatat lengkap. 📋✨\n\n📸 LANGKAH TERAKHIR:\nSilakan kirimkan 1 FOTO DIRI ANDA (pasfoto / foto formal) di obrolan ini.\n\n✨ TIPS PENTING AGAR FOTO TIDAK BLUR / PECAH:\nSaat memilih foto di galeri LINE, tekan/centang tombol "ORIGINAL" (atau "ASLI") di pojok kiri bawah layar sebelum menekan tombol Kirim. Foto akan otomatis tersimpan dalam kualitas Full HD di Cloudinary!`
      );
    }

    // STEP 9: Awaiting Photo
    if (ongoingReg.step === 'awaiting_photo') {
      return await sendReply(
        '📸 Silakan kirimkan 1 FOTO DIRI Anda di obrolan ini untuk melengkapi pendaftaran.\n\n(Pastikan mencentang tombol "ORIGINAL" di galeri LINE sebelum kirim agar foto tersimpan Full HD tanpa blur).'
      );
    }

    // STEP 10: Awaiting Confirmation
    if (ongoingReg.step === 'awaiting_confirmation') {
      if (
        lowerText === 'konfirmasi' ||
        lowerText === 'ya' ||
        lowerText === 'setuju' ||
        lowerText === '/konfirmasi_reg' ||
        lowerText === '?konfirmasi_reg' ||
        lowerText === '#konfirmasi_reg' ||
        lowerText === 'konfirmasi_reg'
      ) {
        return await finalizeRegistration(ongoingReg, lineUserId, sendReply);
      } else {
        return await sendReply(
          'Silakan ketik "konfirmasi" untuk menyelesaikan pendaftaran, atau ketik "batal" untuk membatalkan.'
        );
      }
    }
  }

  // ==========================================
  // INITIATE REGISTRATION ("registrasi" or one-shot paste)
  // ==========================================
  if (
    lowerText === 'registrasi' ||
    lowerText === '?registrasi' ||
    lowerText === '#registrasi' ||
    lowerText === '/registrasi' ||
    lowerText.startsWith('registrasi') ||
    lowerText.startsWith('?registrasi') ||
    lowerText.startsWith('#registrasi') ||
    lowerText.startsWith('/registrasi')
  ) {
    if (!lowerText.includes('registrasi_akun')) {
      // 1. Prevent Double Registration: check if this LINE User ID is already verified
      if (existingMember && existingMember.line_verification_status === 'verified') {
        return await sendReply(
          `Halo ${existingMember.full_name}! 👋✨\n\nAkun LINE kamu sudah terdaftar dan aktif di sistem database MP Community.\n\n💡 Ingin melihat atau mengubah data?\n• Ketik "profil" untuk melihat kartu profilmu\n• Ketik "ubah biodata" untuk memperbarui data diri\n• Ketik "ganti foto" untuk mengunggah foto profil baru (Full HD)\n\nTerima kasih banyak! 😊🙏`
        );
      }

      // 2. Check if user pasted the entire multi-line template at once
      if (
        rawText.includes(':') &&
        (lowerText.includes('nama lengkap') || lowerText.includes('nama'))
      ) {
        const parsed = parseRegistrationText(rawText);
        if (parsed) {
          const inputNameClean = parsed.fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
          const inputClassClean = (parsed.classOrigin || '').toLowerCase().replace(/[^a-z0-9]/g, '');

          const matchedCandidate = allMembers.find((m) => {
            if (m.line_verification_status === 'verified') return false;
            const mNameClean = (m.full_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const mNickClean = (m.nickname || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const mClassClean = (m.class_origin || '').toLowerCase().replace(/[^a-z0-9]/g, '');

            const nameMatch =
              mNameClean.length >= 3 &&
              (mNameClean.includes(inputNameClean) ||
                inputNameClean.includes(mNameClean) ||
                (mNickClean.length >= 3 && inputNameClean.includes(mNickClean)));

            const classMatch =
              !mClassClean ||
              !inputClassClean ||
              mClassClean.includes(inputClassClean) ||
              inputClassClean.includes(mClassClean);

            return nameMatch && classMatch;
          });

          if (!matchedCandidate) {
            return await sendReply(
              `Halo ${parsed.fullName}! Maaf ya, nama atau asal kelas kamu (${parsed.classOrigin || '-'}) belum terdaftar dalam daftar calon anggota yang diizinkan untuk registrasi di MP Community.\n\nPastikan penulisan nama dan asal kelasmu sesuai dengan yang telah dicatat pengurus ya. Jika kamu adalah anggota baru, silakan hubungi pengurus atau Superadmin terlebih dahulu agar datamu dimasukkan ke daftar whitelist. Semangat dan Tuhan memberkati! 🙏✨`
            );
          }

          pendingMemberRegistrations.set(lineUserId, {
            ...parsed,
            matchedMemberId: matchedCandidate.id,
            lineUserId,
            step: 'awaiting_photo',
            expiresAt: Date.now() + 1800000,
          });

          const reply = `📋 DATA PENDAFTARAN DICATAT!\n\nHalo ${matchedCandidate.full_name}! Data kamu berhasil dicocokkan dengan daftar calon anggota MP Community (${matchedCandidate.class_origin || parsed.classOrigin || 'Komunitas'}).\n\n📸 LANGKAH TERAKHIR:\nSilakan kirimkan 1 FOTO DIRI ANDA (pasfoto/foto formal) di obrolan ini.\n\n✨ TIPS PENTING AGAR FOTO TIDAK BLUR / PECAH:\nSaat memilih foto di galeri LINE, tekan/centang tombol "ORIGINAL" (atau "ASLI") di pojok kiri bawah layar sebelum menekan tombol Kirim. Foto akan tersimpan dalam kualitas Full HD tanpa kompresi otomatis LINE.`;
          return await sendReply(reply);
        }
      }

      // 3. Conversational step-by-step entry
      pendingMemberRegistrations.set(lineUserId, {
        lineUserId,
        step: 'awaiting_name',
        expiresAt: Date.now() + 1800000,
      });

      return await sendReply(
        `Halo! Selamat datang di pendaftaran anggota MP Community! ✝️✨\n\nSenang sekali kamu ingin bergabung bersama kami. Kami akan mencatat data dirimu secara bertahap.\n\nUntuk memulai, silakan ketik NAMA LENGKAP kamu (sesuai data yang didaftarkan ke pengurus):\n\n(Ketik "batal" kapan saja untuk membatalkan)`
      );
    }
  }

  // Handle direct confirmation if user clicks confirmation button from Flex Card
  if (
    lowerText === '/konfirmasi_reg' ||
    lowerText === '?konfirmasi_reg' ||
    lowerText === '#konfirmasi_reg' ||
    lowerText === 'konfirmasi_reg'
  ) {
    const pending = pendingMemberRegistrations.get(lineUserId);
    if (!pending || !pending.photoUrl) {
      return await sendReply(
        '⚠️ Tidak ada data pendaftaran yang siap dikonfirmasi atau Anda belum mengunggah foto. Silakan ketik "registrasi" untuk memulai pendaftaran baru.'
      );
    }
    return await finalizeRegistration(pending, lineUserId, sendReply);
  }

  if (
    lowerText === '/batal_reg' ||
    lowerText === '?batal_reg' ||
    lowerText === '#batal_reg' ||
    lowerText === 'batal_reg'
  ) {
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
  // E. MEMBER PROFILE & BIODATA MANAGEMENT (FOR ACTIVE MEMBERS)
  // ==========================================

  // E.1. VIEW PROFILE CARD (Triggers: profil, biodata, menu [if not officer], etc.)
  const isProfileTrigger =
    lowerText === 'profil' ||
    lowerText === 'profile' ||
    lowerText === '?profil' ||
    lowerText === '#profil' ||
    lowerText === 'biodata' ||
    lowerText === '?biodata' ||
    lowerText === 'lihat profil' ||
    lowerText === 'cek profil' ||
    (!isOfficer && (lowerText === 'menu' || lowerText === '?menu' || lowerText === '#menu'));

  if (isProfileTrigger && existingMember && existingMember.status === 'active') {
    const profileFlex = LineApiClient.buildMemberProfileFlex({
      fullName: existingMember.full_name,
      baptismalName: existingMember.baptismal_name,
      lineId: existingMember.line_id,
      instagram: existingMember.instagram_account,
      classOrigin: existingMember.class_origin,
      entryYear: existingMember.entry_year,
      birthDate: existingMember.birth_date,
      birthMonth: existingMember.birth_month,
      birthYear: existingMember.birth_year,
      whatsapp: existingMember.whatsapp_number,
      photoUrl: existingMember.photo_url,
      role: existingMember.community_role,
    });

    if (replyToken) {
      await lineClient.replyMessage(replyToken, [profileFlex]);
    }
    return { status: 'sent_member_profile_menu', memberId: existingMember.id };
  }

  // E.2. GANTI FOTO PROFIL TRIGGER
  if (
    (lowerText === 'ganti_foto' ||
      lowerText === 'ubah_foto' ||
      lowerText === 'ganti foto' ||
      lowerText === 'ubah foto' ||
      lowerText === 'edit foto' ||
      lowerText === '?ganti_foto' ||
      lowerText === '#ganti_foto') &&
    existingMember &&
    existingMember.status === 'active'
  ) {
    pendingPhotoUpdates.set(lineUserId, {
      memberId: existingMember.id,
      fullName: existingMember.full_name,
      classOrigin: existingMember.class_origin,
      expiresAt: Date.now() + 1800000,
    });

    const publicId = `${existingMember.full_name} - ${existingMember.class_origin || 'Umum'}`;
    const promptMsg = `📸 GANTI FOTO PROFIL\n\nHalo ${existingMember.full_name}!\nSilakan kirimkan 1 FOTO DIRI TERBARU kamu di obrolan ini.\n\n✨ TIPS PENTING AGAR FOTO TIDAK BLUR / PECAH:\nSaat memilih foto di galeri LINE, pastikan tekan/centang tombol "ORIGINAL" (atau "ASLI") di pojok kiri bawah layar sebelum menekan tombol Kirim.\n\nFoto akan otomatis disimpan di Cloudinary dalam resolusi Full HD dengan format nama:\n"${publicId}".`;
    return await sendReply(promptMsg);
  }

  // E.3. UBAH BIODATA REQUEST (SENDS EDIT TEMPLATE)
  if (
    (lowerText === 'ubah_biodata' ||
      lowerText === 'edit_biodata' ||
      lowerText === 'edit biodata' ||
      lowerText === 'ubah biodata' ||
      lowerText === 'update biodata' ||
      lowerText === '?ubah_biodata' ||
      lowerText === '#ubah_biodata') &&
    existingMember &&
    existingMember.status === 'active'
  ) {
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    const monthStr = monthNames[(existingMember.birth_month || 1) - 1] || `${existingMember.birth_month}`;
    const currentBirth = `${existingMember.birth_date} ${monthStr} ${existingMember.birth_year || ''}`.trim();

    const templateMsg = `📝 FORM UBAH BIODATA ANGGOTA\n\nHalo ${existingMember.full_name}! 👋\nSilakan salin teks di bawah ini, ubah data yang ingin kamu perbarui, lalu kirimkan kembali ke obrolan ini:\n\n#update_biodata\nNama Lengkap : ${existingMember.full_name}\nNama Baptis : ${existingMember.baptismal_name || '-'}\nIDLine : ${existingMember.line_id || '-'}\nInstagram : ${existingMember.instagram_account || '-'}\nKelas : ${existingMember.class_origin || '-'}\nTahun Masuk : ${existingMember.entry_year || '-'}\nTanggal lahir : ${currentBirth}\nNomor Whatsapp : ${existingMember.whatsapp_number || '-'}\n\n💡 Tips: Kamu cukup mengubah bagian yang ingin diganti saja. Bagian lain biarkan seperti semula.`;
    return await sendReply(templateMsg);
  }

  // E.4. SUBMIT UPDATED BIODATA (#update_biodata)
  if (
    (lowerText.startsWith('#update_biodata') ||
      lowerText.startsWith('update_biodata') ||
      lowerText.startsWith('?update_biodata') ||
      lowerText.startsWith('#ubah_biodata') ||
      lowerText.startsWith('ubah_biodata')) &&
    existingMember &&
    existingMember.status === 'active'
  ) {
    const parsed = parseRegistrationText(rawText);
    if (!parsed) {
      return await sendReply(
        '⚠️ Format data tidak terbaca dengan lengkap. Pastikan format penulisan sesuai dengan template (#update_biodata).'
      );
    }

    const updated = await updateMember(existingMember.id, {
      full_name: parsed.fullName,
      baptismal_name: parsed.baptismalName,
      line_id: parsed.lineId,
      instagram_account: parsed.instagram,
      class_origin: parsed.classOrigin,
      entry_year: parsed.entryYear,
      birth_date: parsed.birthDate,
      birth_month: parsed.birthMonth,
      birth_year: parsed.birthYear,
      whatsapp_number: parsed.whatsapp,
    });

    const refreshedMember = updated || {
      ...existingMember,
      full_name: parsed.fullName,
      baptismal_name: parsed.baptismalName,
      line_id: parsed.lineId,
      instagram_account: parsed.instagram,
      class_origin: parsed.classOrigin,
      entry_year: parsed.entryYear,
      birth_date: parsed.birthDate,
      birth_month: parsed.birthMonth,
      birth_year: parsed.birthYear,
      whatsapp_number: parsed.whatsapp,
    };

    const profileFlex = LineApiClient.buildMemberProfileFlex({
      fullName: refreshedMember.full_name,
      baptismalName: refreshedMember.baptismal_name,
      lineId: refreshedMember.line_id,
      instagram: refreshedMember.instagram_account,
      classOrigin: refreshedMember.class_origin,
      entryYear: refreshedMember.entry_year,
      birthDate: refreshedMember.birth_date,
      birthMonth: refreshedMember.birth_month,
      birthYear: refreshedMember.birth_year,
      whatsapp: refreshedMember.whatsapp_number,
      photoUrl: refreshedMember.photo_url,
      role: refreshedMember.community_role,
    });

    if (replyToken) {
      await lineClient.replyMessage(replyToken, [
        {
          type: 'text',
          text: `✅ BIODATA BERHASIL DIPERBARUI!\n\nHalo ${parsed.fullName}! Biodata kamu telah sukses diperbarui di database MP Community. Berikut kartu profil terbarumu:`,
        },
        profileFlex,
      ]);
    }

    return { status: 'member_biodata_updated', memberId: existingMember.id };
  }

  // ==========================================
  // F. SECURITY PREFIX VALIDATION & COMMAND DISPATCH
  // ==========================================

  // F.1. OFFICER COMMANDS (MUST START WITH '#')
  if (rawText.startsWith('#')) {
    if (!isOfficer) {
      return await sendReply(
        "Halo! Perintah dengan awalan tanda '#' dikhususkan untuk pengurus/petugas MP Community. Jika kamu anggota terdaftar, kamu bisa langsung mengetikkan pertanyaanmu di obrolan ini tanpa awalan khusus ya. Terima kasih! 🙏✨"
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

    // OFFICER COMMAND: Whitelist pre-approved candidate (#whitelist or #tambah_calon)
    if (
      cleanCommand.startsWith('whitelist ') ||
      cleanCommand.startsWith('tambah_calon ') ||
      cleanCommand.startsWith('calon ')
    ) {
      const payload = rawText.replace(/^[#/?](?:whitelist|tambah_calon|calon)\s+/i, '').trim();
      const parts = payload.split('-');
      const candidateName = parts[0]?.trim();
      const candidateClass = parts[1]?.trim() || '';

      if (!candidateName || candidateName.length < 2) {
        return await sendReply(
          '⚠️ FORMAT TAMBAH CALON ANGGOTA:\n\nGunakan format:\n#whitelist <Nama Lengkap> - <Asal Kelas>\nContoh: #whitelist Tadeus Thenaris - PPTI 23'
        );
      }

      const createdCandidate = await createMember({
        full_name: candidateName,
        class_origin: candidateClass || undefined,
        birth_date: 1,
        birth_month: 1,
        community_role: 'anggota_aktif',
        status: 'active',
        line_verification_status: 'not_set',
      });

      return await sendReply(
        `✅ CALON ANGGOTA BERHASIL DIDAFTARKAN KE WHITELIST!\n\n👤 Nama: ${createdCandidate.full_name}\n🏫 Kelas: ${createdCandidate.class_origin || '-'}\n\n💡 Sekarang yang bersangkutan sudah diizinkan untuk registrasi mandiri via chat bot LINE menggunakan format ?registrasi.`
      );
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

  // E.2. REGISTERED MEMBER INQUIRIES (NO '?' REQUIRED)
  // Check if sender is registered in database (Member or Profile)
  const registeredSender = existingMember || allMembers.find((m) => m.line_user_id === lineUserId);
  const isRegisteredUser = Boolean(registeredSender || userProfile);

  if (!isRegisteredUser) {
    // "Bot jangan merespon apa-apa jika... diluar user terdaftar didatabase"
    // SILENT: Do not respond to unregistered users!
    return { status: 'ignored_unregistered_user' };
  }

  // Registered member can ask directly without '?'; also handles if they still type '?'
  const questionText = rawText.startsWith('?') ? rawText.slice(1).trim() : rawText.trim();

  if (!questionText) {
    return await sendReply(
      "Halo! Ada yang bisa kami bantu seputar komunitas MP? Silakan ketik pertanyaanmu langsung di obrolan ini ya. Terima kasih! 😊🙏"
    );
  }

  // Run Intelligent LLM Triage
  const officerMembers = allMembers.filter((m) => m.community_role && m.community_role !== 'anggota_aktif');
  const triageResult = await triageMemberMessage(
    questionText,
    registeredSender || ({ full_name: userProfile!.name } as Member),
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

// ==========================================
// FORMATTERS & TEMPLATES
// ==========================================
function getMenuMessage(role: UserRole, name: string): string {
  return `🤖 MENU PETUGAS MP CONTROL SYSTEM\nHalo, ${name}!\n\n💡 Perintah Tersedia (Awali dengan #):\n• #status — Cek status otomatisasi hari ini\n• #whitelist <Nama> - <Kelas> — Daftarkan calon anggota baru\n• #help — Panduan lengkap perintah\n• #approve — Setujui renungan harian\n• #reject — Tolak renungan harian\n• #broadcast — Memicu siaran manual ke grup`;
}

function getHelpMessage(role: UserRole, name: string): string {
  return `📖 BANTUAN PERINTAH PETUGAS MP\n\nSemua perintah pengurus wajib diawali tanda '#':\n\n• #status — Pantau status siaran renungan & ultah\n• #whitelist <Nama> - <Kelas> — Buka akses registrasi calon anggota baru\n• #approve — Setujui draft renungan sebelum 09:45 WIB\n• #reject — Tolak siaran renungan\n• #broadcast — Kirim renungan ke grup sekarang\n• #id — Cek LINE User ID Anda\n\nUntuk anggota terdaftar, Anda dapat langsung bertanya seputar komunitas tanpa awalan tanda khusus.`;
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
