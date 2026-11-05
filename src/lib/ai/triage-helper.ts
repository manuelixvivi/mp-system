import Groq from 'groq-sdk';
import { Member, Profile } from '@/types';

export interface TriageResult {
  isRelevant: boolean;
  division: 'logistik' | 'liturgi' | 'pubdok' | 'bendahara' | 'sekretaris' | 'acara' | 'ketua_wakil';
  divisionName: string;
  coordinatorName: string;
  coordinatorLineId?: string;
  coordinatorLineUserId?: string;
  replyMessage: string;
  summaryForOfficer: string;
}

const DIVISION_LABELS: Record<string, string> = {
  logistik: 'Divisi Logistik & Data Anggota',
  liturgi: 'Divisi Liturgi & Humas',
  pubdok: 'Divisi Publikasi & Dokumentasi (Pubdok)',
  bendahara: 'Bendahara Komunitas MP',
  sekretaris: 'Sekretaris Komunitas MP',
  acara: 'Divisi Acara & Kegiatan',
  ketua_wakil: 'Ketua / Wakil Ketua MP Community',
};

/**
 * Analyzes incoming 1-on-1 member chat message using LLM
 * Determines topic, checks scope, routes to appropriate officer, and drafts human-like reply.
 */
export async function triageMemberMessage(
  userMessage: string,
  sender: Member,
  officers: Member[],
  profiles: Profile[] = []
): Promise<TriageResult | null> {
  const cleanMsg = userMessage.trim();
  if (!cleanMsg) return null;

  let isRelevant = false;
  let division: TriageResult['division'] = 'ketua_wakil';
  let llmReason = '';

  const groqKey = process.env.GROQ_API_KEY;

  if (groqKey && groqKey.trim().length > 10) {
    try {
      const groq = new Groq({ apiKey: groqKey.trim() });
      const prompt = `Anda adalah asisten cerdas pengarah pesan untuk komunitas Orang Muda Katolik (Mudika / OMK) "MP Community".
Seorang anggota aktif komunitas baru saja mengirimkan pesan pribadi (japri) ke akun bot resmi:

PENGIRIM: ${sender.full_name} (${sender.class_origin || 'Anggota'})
PESAN: "${cleanMsg}"

ATURAN ANALISIS:
1. Tentukan apakah pesan ini relevan dengan lingkup organisasi keagamaan MP Community (seperti: renungan, misa, doa, ulang tahun, data anggota, iuran, kas, kegiatan, acara, retret, kartu ucapan, foto, kepengurusan, atau hal seputar MP).
2. Jika pesan SAMA SEKALI DI LUAR organisasi MP (misal: tanya cuaca, rumus matematika, resep makanan, gosip umum, politik luar, coding, spam/iseng tanpa kaitan):
   Set "is_relevant": false.
3. Jika relevan, tentukan divisi yang paling tepat:
   - "logistik": Terkait tanggal lahir, data anggota, seragam, inventaris barang, logistik.
   - "liturgi": Terkait renungan harian (Coffee Break with God), misa, bacaan, doa, jadwal tugas gereja.
   - "pubdok": Terkait kartu ucapan ultah, template, foto dokumentasi, media sosial.
   - "bendahara": Terkait keuangan, iuran anggota, kas, nomor rekening, pembayaran.
   - "sekretaris": Terkait administrasi, surat izin, absensi, pendaftaran.
   - "acara": Terkait susunan acara, rundown, retret, jadwal kegiatan bersama.
   - "ketua_wakil": Jika pertanyaan umum, ragu/tidak yakin, atau menyangkut kebijakan organisasi.

Jawab HANYA dalam format JSON valid:
{
  "is_relevant": true / false,
  "division": "logistik" | "liturgi" | "pubdok" | "bendahara" | "sekretaris" | "acara" | "ketua_wakil",
  "reason": "Penjelasan singkat"
}`;

      const response = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const rawJson = response.choices[0]?.message?.content?.trim();
      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        isRelevant = Boolean(parsed.is_relevant);
        if (parsed.division && DIVISION_LABELS[parsed.division]) {
          division = parsed.division;
        }
        llmReason = parsed.reason || '';
      }
    } catch (llmErr) {
      console.warn('[TRIAGE LLM WARNING] Falling back to keyword analysis:', llmErr);
      // Fallback keyword analysis
      const lower = cleanMsg.toLowerCase();
      if (
        lower.includes('lahir') ||
        lower.includes('ultah') ||
        lower.includes('ulang tahun') ||
        lower.includes('umur') ||
        lower.includes('data') ||
        lower.includes('barang')
      ) {
        isRelevant = true;
        division = 'logistik';
      } else if (
        lower.includes('renungan') ||
        lower.includes('misa') ||
        lower.includes('doa') ||
        lower.includes('alkitab') ||
        lower.includes('liturgi')
      ) {
        isRelevant = true;
        division = 'liturgi';
      } else if (
        lower.includes('foto') ||
        lower.includes('desain') ||
        lower.includes('kartu') ||
        lower.includes('pubdok') ||
        lower.includes('ig') ||
        lower.includes('instagram')
      ) {
        isRelevant = true;
        division = 'pubdok';
      } else if (
        lower.includes('uang') ||
        lower.includes('kas') ||
        lower.includes('iuran') ||
        lower.includes('bayar') ||
        lower.includes('dana')
      ) {
        isRelevant = true;
        division = 'bendahara';
      } else if (
        lower.includes('surat') ||
        lower.includes('izin') ||
        lower.includes('sertifikat') ||
        lower.includes('daftar')
      ) {
        isRelevant = true;
        division = 'sekretaris';
      } else if (
        lower.includes('acara') ||
        lower.includes('kegiatan') ||
        lower.includes('retret') ||
        lower.includes('jadwal')
      ) {
        isRelevant = true;
        division = 'acara';
      } else if (
        lower.includes('mp') ||
        lower.includes('komunitas') ||
        lower.includes('ketua') ||
        lower.includes('halo')
      ) {
        isRelevant = true;
        division = 'ketua_wakil';
      }
    }
  }

  // If outside religious organization, do NOT respond
  if (!isRelevant) {
    return null;
  }

  // Find matching coordinator / officer from database
  let targetOfficer: Member | undefined;

  if (division === 'logistik') {
    targetOfficer = officers.find((o) => o.community_role === 'logistik');
  } else if (division === 'liturgi') {
    targetOfficer = officers.find((o) => o.community_role === 'liturgi_humas');
  } else if (division === 'pubdok') {
    targetOfficer = officers.find((o) => o.community_role === 'pubdok');
  } else if (division === 'bendahara') {
    targetOfficer = officers.find((o) => o.community_role === 'bendahara');
  } else if (division === 'sekretaris') {
    targetOfficer = officers.find((o) => o.community_role === 'sekretaris');
  } else if (division === 'acara') {
    targetOfficer = officers.find((o) => o.community_role === 'acara');
  }

  // Fallback to Ketua or Wakil Ketua if not found
  if (!targetOfficer) {
    targetOfficer =
      officers.find((o) => o.community_role === 'ketua') ||
      officers.find((o) => o.community_role === 'wakil_ketua') ||
      officers.find((o) => o.community_role && o.community_role !== 'anggota_aktif') ||
      officers[0];
  }

  // Fallback to Superadmin profile if still no officer found
  let coordinatorName = targetOfficer?.full_name || 'Ketua Komunitas MP';
  let coordinatorLineId = targetOfficer?.line_id;
  let coordinatorLineUserId = targetOfficer?.line_user_id;

  if (!coordinatorLineId && profiles.length > 0) {
    const adminProf = profiles.find((p) => p.role === 'superadmin' && p.is_active);
    if (adminProf) {
      if (!targetOfficer) coordinatorName = adminProf.name;
    }
  }

  const divisionName = DIVISION_LABELS[division] || 'Pengurus MP Community';

  // Construct warm, human-like response in Indonesian
  const contactText = coordinatorLineId
    ? `Kamu bisa langsung menghubungi koordinator kami:\n👤 ${coordinatorName} (${divisionName})\n📲 LINE ID: @${coordinatorLineId.replace(/^@/, '')}`
    : `Silakan menghubungi pengurus kami:\n👤 ${coordinatorName} (${divisionName})`;

  const replyMessage = `Halo ${sender.full_name}! 👋✨\n\nTerima kasih sudah bertanya. Berdasarkan pertanyaanmu, hal ini dikoordinasikan oleh **${divisionName}**.\n\n${contactText}\n\nPesan kamu juga sudah otomatis kami teruskan ke pengurus terkait agar dapat segera dibantu ya. Semangat dan Tuhan memberkati! 🙏❤️`;

  const summaryForOfficer = `📩 [PESAN MASUK DARI ANGGOTA MP]\n\nDari: ${sender.full_name} (${sender.class_origin || 'Anggota Aktif'})\nID LINE: @${sender.line_id || '-'}\n\nIsi Pesan:\n"${cleanMsg}"\n\n🤖 Analisis AI: Relevan untuk ${divisionName} (${llmReason || 'Topik komunitas'}). Silakan follow-up anggota tersebut jika diperlukan.`;

  return {
    isRelevant: true,
    division,
    divisionName,
    coordinatorName,
    coordinatorLineId,
    coordinatorLineUserId,
    replyMessage,
    summaryForOfficer,
  };
}
