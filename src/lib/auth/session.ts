import { SignJWT, jwtVerify } from 'jose';
import { SafeProfile } from '@/types';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'mp_control_system_super_secret_jwt_key_2026_wib'
);

export const COOKIE_NAME = 'mp_session_token';

/**
 * Creates and signs a session JWT
 */
export async function createSessionToken(profile: SafeProfile): Promise<string> {
  const token = await new SignJWT({
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    line_user_id: profile.line_user_id,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);

  return token;
}

/**
 * Verifies a session JWT from cookie
 */
export async function verifySessionToken(token: string): Promise<SafeProfile | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      algorithms: ['HS256'],
    });

    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as any,
      line_user_id: payload.line_user_id as string | undefined,
      is_active: true,
      created_at: new Date().toISOString(),
    };
  } catch (err) {
    return null;
  }
}
