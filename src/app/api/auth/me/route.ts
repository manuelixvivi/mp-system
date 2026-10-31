import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth/session';
import { getProfileByEmail } from '@/lib/db/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const sessionUser = await verifySessionToken(token);
  if (!sessionUser || !sessionUser.email) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  // Strictly validate live profile and role directly from database
  const dbUser = await getProfileByEmail(sessionUser.email);
  if (!dbUser || !dbUser.is_active) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  // Returns safe profile with live role validated strictly from database
  return NextResponse.json({
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      line_user_id: dbUser.line_user_id,
      is_active: dbUser.is_active,
    },
  });
}
