import { NextResponse } from 'next/server';
import { generateMemberExcelTemplate } from '@/lib/excel/member-parser';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const buffer = generateMemberExcelTemplate();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="template_anggota_ulang_tahun.xlsx"',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
