import * as XLSX from 'xlsx';
import { Member } from '@/types';

const MONTH_NAMES_MAP: Record<string, number> = {
  januari: 1,
  jan: 1,
  februari: 2,
  feb: 2,
  maret: 3,
  mar: 3,
  april: 4,
  apr: 4,
  mei: 5,
  may: 5,
  juni: 6,
  jun: 6,
  juli: 7,
  jul: 7,
  agustus: 8,
  ags: 8,
  aug: 8,
  september: 9,
  sep: 9,
  oktober: 10,
  okt: 10,
  oct: 10,
  november: 11,
  nov: 11,
  desember: 12,
  des: 12,
  dec: 12,
};

export function parseMonthValue(val: any): number | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'number') {
    if (val >= 1 && val <= 12) return val;
    return undefined;
  }
  const clean = String(val).trim().toLowerCase();
  if (/^\d+$/.test(clean)) {
    const num = parseInt(clean, 10);
    if (num >= 1 && num <= 12) return num;
  }
  return MONTH_NAMES_MAP[clean];
}

export function parseDateString(str: string): { d: number; m: number; y?: number } | null {
  const clean = str.trim();

  // 1. DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{4}))?$/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const y = dmyMatch[3] ? parseInt(dmyMatch[3], 10) : undefined;
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      return { d, m, y };
    }
  }

  // 2. YYYY-MM-DD
  const ymdMatch = clean.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10);
    const d = parseInt(ymdMatch[3], 10);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      return { d, m, y };
    }
  }

  // 3. DD MonthName YYYY (e.g. 15 November 2005)
  const textMatch = clean.match(/^(\d{1,2})\s+([a-zA-Z]+)(?:\s+(\d{4}))?$/);
  if (textMatch) {
    const d = parseInt(textMatch[1], 10);
    const m = parseMonthValue(textMatch[2]);
    const y = textMatch[3] ? parseInt(textMatch[3], 10) : undefined;
    if (d >= 1 && d <= 31 && m) {
      return { d, m, y };
    }
  }

  return null;
}

export interface ParsedMemberRowResult {
  rowNumber: number;
  member?: Omit<Member, 'id' | 'created_at'>;
  error?: string;
  rawRow: any;
}

export function parseExcelMemberRow(row: any, rowNumber: number): ParsedMemberRowResult {
  // Find Name column
  const nameVal =
    row['Nama Lengkap'] ||
    row['Nama'] ||
    row['Full Name'] ||
    row['Name'] ||
    row['nama_lengkap'] ||
    row['nama'];

  if (!nameVal || String(nameVal).trim().length < 2) {
    return {
      rowNumber,
      error: 'Nama lengkap tidak boleh kosong (minimal 2 karakter)',
      rawRow: row,
    };
  }
  const full_name = String(nameVal).trim();

  // Baptismal Name
  const baptVal = row['Nama Baptis'] || row['Baptismal Name'] || row['nama_baptis'] || row['Baptis'];
  const baptismal_name = baptVal ? String(baptVal).trim() : undefined;

  let birth_date: number | undefined;
  let birth_month: number | undefined;
  let birth_year: number | undefined;

  // Check separate day / month / year columns first
  const dayVal = row['Tgl'] || row['Tanggal'] || row['Hari'] || row['Day'] || row['birth_date'] || row['Tanggal Lahir'];
  const monthVal = row['Bulan'] || row['Bulan Lahir'] || row['Month'] || row['birth_month'];
  const yearVal = row['Tahun'] || row['Tahun Lahir'] || row['Year'] || row['birth_year'];

  if (monthVal !== undefined) {
    birth_month = parseMonthValue(monthVal);
    if (dayVal !== undefined) {
      if (typeof dayVal === 'number') {
        birth_date = dayVal;
      } else {
        const parsedD = parseInt(String(dayVal).trim(), 10);
        if (!isNaN(parsedD)) birth_date = parsedD;
      }
    }
    if (yearVal) {
      const parsedY = parseInt(String(yearVal).trim(), 10);
      if (!isNaN(parsedY) && parsedY >= 1900 && parsedY <= 2100) birth_year = parsedY;
    }
  }

  // If date was not found from separate columns, check single full date column
  if (!birth_date || !birth_month) {
    const fullDateVal =
      row['Tanggal Lahir (Full)'] ||
      row['Tanggal Lahir'] ||
      row['TTL'] ||
      row['Birth Date'] ||
      row['Tanggal Lengkap'] ||
      row['tgl_lahir'];

    if (fullDateVal instanceof Date) {
      birth_date = fullDateVal.getUTCDate();
      birth_month = fullDateVal.getUTCMonth() + 1;
      birth_year = fullDateVal.getUTCFullYear();
    } else if (typeof fullDateVal === 'number') {
      const parsedSSF = XLSX.SSF.parse_date_code(fullDateVal);
      if (parsedSSF) {
        birth_date = parsedSSF.d;
        birth_month = parsedSSF.m;
        birth_year = parsedSSF.y;
      }
    } else if (typeof fullDateVal === 'string') {
      const parsed = parseDateString(fullDateVal);
      if (parsed) {
        birth_date = parsed.d;
        birth_month = parsed.m;
        birth_year = parsed.y;
      }
    }
  }

  if (!birth_date || isNaN(birth_date) || birth_date < 1 || birth_date > 31) {
    return {
      rowNumber,
      error: `Tanggal lahir (1-31) tidak valid untuk "${full_name}"`,
      rawRow: row,
    };
  }

  if (!birth_month || isNaN(birth_month) || birth_month < 1 || birth_month > 12) {
    return {
      rowNumber,
      error: `Bulan lahir (1-12) tidak valid untuk "${full_name}"`,
      rawRow: row,
    };
  }

  // Class origin
  const classVal = row['Asal Kelas'] || row['Kelas'] || row['Class Origin'] || row['Class'] || row['asal_kelas'];
  const class_origin = classVal ? String(classVal).trim() : undefined;

  // Entry year
  const entryVal = row['Tahun Masuk'] || row['Angkatan'] || row['Entry Year'] || row['tahun_masuk'];
  let entry_year: number | undefined;
  if (entryVal) {
    const parsedEntry = parseInt(String(entryVal).trim(), 10);
    if (!isNaN(parsedEntry) && parsedEntry >= 1990 && parsedEntry <= 2100) {
      entry_year = parsedEntry;
    }
  }

  // LINE User ID
  const lineVal = row['LINE User ID'] || row['ID LINE'] || row['LINE ID'] || row['Akun LINE'] || row['line_user_id'];
  const line_user_id = lineVal ? String(lineVal).trim() : '';

  // Instagram account
  const igVal = row['Akun Instagram'] || row['Instagram'] || row['IG'] || row['instagram_account'];
  let instagram_account: string | undefined = undefined;
  if (igVal) {
    const rawIg = String(igVal).trim().replace(/^@/, '');
    if (rawIg.length > 0) {
      instagram_account = `@${rawIg}`;
    }
  }

  // Notes
  const notesVal = row['Catatan'] || row['Notes'] || row['Keterangan'] || row['notes'];
  const notes = notesVal ? String(notesVal).trim() : undefined;

  return {
    rowNumber,
    member: {
      full_name,
      baptismal_name,
      birth_date,
      birth_month,
      birth_year,
      class_origin,
      entry_year,
      line_user_id,
      line_display_name: full_name,
      instagram_account,
      line_verification_status: line_user_id ? 'verified' : 'not_set',
      status: 'active',
      notes,
    },
    rawRow: row,
  };
}

/**
 * Parses an Excel file buffer into validated Member rows
 */
export function parseMemberExcelBuffer(buffer: ArrayBuffer | Buffer): {
  validMembers: Omit<Member, 'id' | 'created_at'>[];
  errors: { row: number; error: string; data: any }[];
  totalRows: number;
} {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('File Excel tidak memiliki lembar kerja (worksheet).');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const validMembers: Omit<Member, 'id' | 'created_at'>[] = [];
  const errors: { row: number; error: string; data: any }[] = [];

  rows.forEach((row, index) => {
    // Row 1 is header in Excel, so data rows start at row 2
    const res = parseExcelMemberRow(row, index + 2);
    if (res.error || !res.member) {
      errors.push({
        row: res.rowNumber,
        error: res.error || 'Data baris tidak valid',
        data: row,
      });
    } else {
      validMembers.push(res.member);
    }
  });

  return {
    validMembers,
    errors,
    totalRows: rows.length,
  };
}

/**
 * Generates official Excel template for uploading member birthdays
 */
export function generateMemberExcelTemplate(): Buffer {
  const wb = XLSX.utils.book_new();

  const headers = [
    'Nama Lengkap',
    'Nama Baptis',
    'Tanggal Lahir (1-31)',
    'Bulan Lahir (1-12)',
    'Tahun Lahir',
    'Asal Kelas',
    'Angkatan / Tahun Masuk',
    'LINE User ID',
    'Akun Instagram',
    'Catatan',
  ];

  const sampleRows = [
    [
      'Alexander Kevin Pratama',
      'Alexander',
      14,
      11,
      2005,
      'XII MIPA 1',
      2023,
      'U1234567890abcdef',
      '@kevinpratama',
      'Koordinator Liturgi',
    ],
    [
      'Theresia Angela Wijaya',
      'Theresia',
      22,
      5,
      2006,
      'XI-A',
      2024,
      'U9876543210fedcba',
      '@angela.wijaya',
      'Anggota Aktif',
    ],
    [
      'Benedictus Ryan Santoso',
      'Benedictus',
      4,
      11,
      2004,
      'XII IPS 2',
      2022,
      '',
      '@ryan_santoso',
      'Ulang tahun hari ini',
    ],
  ];

  const wsData = [headers, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths for readability
  ws['!cols'] = [
    { wch: 28 }, // Nama Lengkap
    { wch: 18 }, // Nama Baptis
    { wch: 20 }, // Tanggal Lahir
    { wch: 18 }, // Bulan Lahir
    { wch: 14 }, // Tahun Lahir
    { wch: 16 }, // Asal Kelas
    { wch: 24 }, // Angkatan
    { wch: 24 }, // LINE User ID
    { wch: 20 }, // Akun Instagram
    { wch: 26 }, // Catatan
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Data Anggota MP');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
