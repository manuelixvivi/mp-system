/**
 * Helper to parse member self-registration commands from LINE Bot
 */

export interface ParsedMemberData {
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
}

const MONTH_MAP: Record<string, number> = {
  januari: 1,
  jan: 1,
  january: 1,
  februari: 2,
  feb: 2,
  february: 2,
  maret: 3,
  mar: 3,
  march: 3,
  april: 4,
  apr: 4,
  mei: 5,
  may: 5,
  juni: 6,
  jun: 6,
  june: 6,
  juli: 7,
  jul: 7,
  july: 7,
  agustus: 8,
  agt: 8,
  agu: 8,
  august: 8,
  september: 9,
  sep: 9,
  sept: 9,
  oktober: 10,
  okt: 10,
  october: 10,
  november: 11,
  nov: 11,
  desember: 12,
  des: 12,
  december: 12,
};

export function parseRegistrationText(rawText: string): ParsedMemberData | null {
  const lower = rawText.toLowerCase();

  // Must contain 'registrasi' and not be staff token activation 'registrasi_akun'
  // Supports ?registrasi, /registrasi, #registrasi, or plain registrasi
  if (!lower.includes('registrasi') || lower.includes('registrasi_akun')) {
    return null;
  }

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let fullName = '';
  let baptismalName = '';
  let lineId = '';
  let instagram = '';
  let classOrigin = '';
  let entryYear: number | undefined;
  let birthDate = 1;
  let birthMonth = 1;
  let birthYear: number | undefined;
  let whatsapp = '';

  for (const rawLine of lines) {
    // Normalize Asian/Japanese fullwidth colon '：' to standard ':'
    const line = rawLine.replace(/：/g, ':');
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const label = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();
    if (!value) continue;

    if (label.includes('nama lengkap') || label === 'nama') {
      fullName = value;
    } else if (label.includes('baptis')) {
      baptismalName = value;
    } else if (label.includes('line') || label === 'idline') {
      lineId = value.replace(/^@/, '');
    } else if (label.includes('instagram') || label === 'ig') {
      instagram = value.replace(/^@/, '');
    } else if (label.includes('kelas')) {
      classOrigin = value;
    } else if (label.includes('tahun') || label.includes('angkatan')) {
      const yearMatch = value.match(/\b(19\d{2}|20\d{2})\b/);
      if (yearMatch) entryYear = parseInt(yearMatch[1], 10);
    } else if (label.includes('lahir') || label.includes('tgl') || label.includes('tanggal')) {
      // Parse e.g. "05 November 2026", "28 Oktober 2005", "15-08-2004", "15/08/2004"
      const dateParts = value.match(/^(\d{1,2})[\s\-/.]([A-Za-z]+|\d{1,2})(?:[\s\-/.](19\d{2}|20\d{2}))?$/);
      if (dateParts) {
        birthDate = parseInt(dateParts[1], 10);
        const rawM = dateParts[2].toLowerCase();
        if (MONTH_MAP[rawM]) {
          birthMonth = MONTH_MAP[rawM];
        } else if (!isNaN(parseInt(rawM, 10))) {
          birthMonth = parseInt(rawM, 10);
        }
        if (dateParts[3]) {
          birthYear = parseInt(dateParts[3], 10);
        }
      } else {
        // Simple fallback search for day and month
        const dayM = value.match(/\b([1-9]|[12]\d|3[01])\b/);
        if (dayM) birthDate = parseInt(dayM[1], 10);
        for (const [mName, mNum] of Object.entries(MONTH_MAP)) {
          if (value.toLowerCase().includes(mName)) {
            birthMonth = mNum;
            break;
          }
        }
        const yM = value.match(/\b(19\d{2}|20\d{2})\b/);
        if (yM) birthYear = parseInt(yM[1], 10);
      }
    } else if (label.includes('whatsapp') || label.includes('wa') || label.includes('nomor') || label.includes('hp')) {
      whatsapp = value;
    }
  }

  if (!fullName) {
    return null;
  }

  return {
    fullName,
    baptismalName: baptismalName || undefined,
    lineId: lineId || undefined,
    instagram: instagram || undefined,
    classOrigin: classOrigin || undefined,
    entryYear,
    birthDate: Math.min(Math.max(birthDate, 1), 31),
    birthMonth: Math.min(Math.max(birthMonth, 1), 12),
    birthYear,
    whatsapp: whatsapp || undefined,
  };
}
