import { NextRequest, NextResponse } from 'next/server';
import { validateUserPassword } from '@/lib/db/store';
import { createSessionToken, COOKIE_NAME } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email dan password wajib diisi.' },
        { status: 400 }
      );
    }

    // Securely validate credentials against database bcrypt hash
    // (Notice: plain password is never logged or stored)
    const user = await validateUserPassword(email, password);

    if (!user) {
      return NextResponse.json(
        { error: 'Email atau password salah.' },
        { status: 401 }
      );
    }

    // Generate signed JWT token
    const token = await createSessionToken(user);

    const response = NextResponse.json({
      success: true,
      message: 'Autentikasi berhasil',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        line_user_id: user.line_user_id,
      },
    });

    // Set secure httpOnly cookie
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat autentikasi.' },
      { status: 500 }
    );
  }
}
