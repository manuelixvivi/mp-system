import { NextRequest, NextResponse } from 'next/server';
import { uploadPhotoToDriveOrLocal } from '@/lib/drive/client';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth/session';
import { getProfileByEmail, updateMember } from '@/lib/db/store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Check auth
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionUser = await verifySessionToken(token);
  if (!sessionUser?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getProfileByEmail(sessionUser.email);
  if (!user || !user.is_active) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const fullName = (formData.get('full_name') as string | null) || 'Anggota';
    const classOrigin = (formData.get('class_origin') as string | null) || 'Umum';
    const memberId = formData.get('member_id') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'File foto tidak ditemukan.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Format Cloudinary: "Nama - Kelas"
    const cleanName = fullName.trim().replace(/[/\\?%*:|"<>]/g, '');
    const cleanClass = classOrigin.trim().replace(/[/\\?%*:|"<>]/g, '');
    const customPublicId = `${cleanName} - ${cleanClass}`;

    const uploadResult = await uploadPhotoToDriveOrLocal(
      `${customPublicId}.jpg`,
      file.type || 'image/jpeg',
      buffer,
      { customPublicId }
    );

    // If memberId is provided, update member record directly
    if (memberId) {
      await updateMember(memberId, { photo_url: uploadResult.url });
    }

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      public_id: customPublicId,
      source: uploadResult.source,
    });
  } catch (err: any) {
    console.error('[MEMBER PHOTO UPLOAD ERROR]:', err);
    return NextResponse.json({ error: err.message || 'Gagal mengunggah foto anggota' }, { status: 500 });
  }
}
