import { NextRequest, NextResponse } from 'next/server';
import { createMembersBulk, getProfileByEmail, addActivityLog } from '@/lib/db/store';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth/session';
import { parseMemberExcelBuffer } from '@/lib/excel/member-parser';

export const dynamic = 'force-dynamic';

async function getAuthorizedUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const sessionUser = await verifySessionToken(token);
  if (!sessionUser?.email) return null;
  const dbUser = await getProfileByEmail(sessionUser.email);
  if (!dbUser || !dbUser.is_active) return null;
  return dbUser;
}

export async function POST(req: NextRequest) {
  const user = await getAuthorizedUser(req);
  if (!user || (user.role !== 'superadmin' && user.role !== 'logistik')) {
    return NextResponse.json(
      { error: 'Akses ditolak: Hanya Tim Logistik dan Superadmin yang berwenang mengimpor data anggota.' },
      { status: 403 }
    );
  }

  try {
    const contentType = req.headers.get('content-type') || '';

    // 1. File Upload (multipart/form-data)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'File Excel (.xlsx) wajib diunggah.' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const { validMembers, errors, totalRows } = parseMemberExcelBuffer(buffer);

      if (validMembers.length === 0) {
        return NextResponse.json(
          {
            error: 'Tidak ada data anggota yang valid untuk diimpor.',
            details: errors,
            totalRows,
          },
          { status: 400 }
        );
      }

      const created = await createMembersBulk(validMembers);

      addActivityLog({
        user_id: user.id,
        user_name: user.name,
        actor_type: 'user',
        action: 'members_imported_xlsx',
        entity_type: 'member',
        entity_id: user.id,
        details: {
          imported_count: created.length,
          total_rows: totalRows,
          errors_count: errors.length,
          filename: file.name,
        },
      });

      return NextResponse.json({
        success: true,
        count: created.length,
        totalRows,
        members: created,
        errors,
        message: `Berhasil mengimpor ${created.length} data anggota dari Excel!${
          errors.length > 0 ? ` (${errors.length} baris dilewati karena format tidak sesuai)` : ''
        }`,
      });
    }

    // 2. Direct JSON payload ({ members: [...] })
    const body = await req.json();
    const membersToImport = body.members;

    if (!Array.isArray(membersToImport) || membersToImport.length === 0) {
      return NextResponse.json({ error: 'Array data members wajib disertakan.' }, { status: 400 });
    }

    const created = await createMembersBulk(membersToImport);

    addActivityLog({
      user_id: user.id,
      user_name: user.name,
      actor_type: 'user',
      action: 'members_imported_json',
      entity_type: 'member',
      entity_id: user.id,
      details: { imported_count: created.length },
    });

    return NextResponse.json({
      success: true,
      count: created.length,
      members: created,
      message: `Berhasil menyimpan ${created.length} data anggota!`,
    });
  } catch (err: any) {
    console.error('[IMPORT MEMBERS ERROR]:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan sistem saat mengimpor.' }, { status: 500 });
  }
}
