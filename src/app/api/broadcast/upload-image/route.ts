import { NextRequest, NextResponse } from 'next/server';
import { uploadPhotoToDriveOrLocal } from '@/lib/drive/client';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth/session';
import { getProfileByEmail } from '@/lib/db/store';

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

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await uploadPhotoToDriveOrLocal(
      `custom_broadcast_${Date.now()}_${file.name}`,
      file.type || 'image/jpeg',
      buffer
    );

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      source: uploadResult.source,
    });
  } catch (err: any) {
    console.error('Upload broadcast image error:', err);
    return NextResponse.json({ error: err.message || 'Gagal mengunggah gambar' }, { status: 500 });
  }
}
