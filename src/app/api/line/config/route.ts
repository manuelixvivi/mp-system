import { NextRequest, NextResponse } from 'next/server';
import { getLineBot, updateLineBot, getProfileByEmail, addActivityLog } from '@/lib/db/store';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

async function getSuperadmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const sessionUser = await verifySessionToken(token);
  if (!sessionUser?.email) return null;

  const profile = await getProfileByEmail(sessionUser.email);
  if (!profile || !profile.is_active || profile.role !== 'superadmin') {
    return null;
  }
  return profile;
}

export async function GET(req: NextRequest) {
  try {
    const admin = await getSuperadmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Superadmin yang dapat mengakses konfigurasi LINE Bot.' }, { status: 403 });
    }

    const bot = await getLineBot();
    const envToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const envSecret = process.env.LINE_CHANNEL_SECRET;
    const envChannelId = process.env.LINE_CHANNEL_ID;

    const activeToken = envToken || bot.channel_access_token || '';
    const activeSecret = envSecret || bot.channel_secret || '';
    const activeChannelId = envChannelId || bot.channel_id || '';

    // Mask secret and token for security display
    const maskString = (str: string) => {
      if (!str || str.length < 8) return '••••••••••••••••';
      return str.slice(0, 4) + '•'.repeat(Math.min(24, str.length - 8)) + str.slice(-4);
    };

    return NextResponse.json({
      bot: {
        id: bot.id,
        name: bot.name || 'MP Community Official Bot',
        channelId: activeChannelId,
        channelSecretMasked: maskString(activeSecret),
        channelAccessTokenMasked: maskString(activeToken),
        status: bot.status || (activeToken ? 'connected' : 'disconnected'),
        isConfigured: !!(activeToken && activeSecret && !activeToken.includes('demo') && !activeToken.includes('dummy')),
        source: envToken ? 'environment_variable' : 'database',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await getSuperadmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Superadmin yang dapat mengubah konfigurasi LINE Bot.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, channelId, channelSecret, channelAccessToken } = body;

    const updates: any = {};
    if (name) updates.name = name;
    if (channelId) updates.channel_id = channelId;
    if (channelSecret && !channelSecret.includes('•')) updates.channel_secret = channelSecret;
    if (channelAccessToken && !channelAccessToken.includes('•')) updates.channel_access_token = channelAccessToken;

    const updated = await updateLineBot(updates);

    addActivityLog({
      user_id: admin.id,
      user_name: admin.name,
      actor_type: 'user',
      action: 'line_bot_configured',
      entity_type: 'line_bot',
      entity_id: updated.id,
      details: { channelId: updated.channel_id, name: updated.name },
    });

    return NextResponse.json({ success: true, message: 'Kredensial LINE Bot berhasil diperbarui!', bot: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// Test connection to LINE Messaging API
export async function POST(req: NextRequest) {
  try {
    const admin = await getSuperadmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Superadmin yang dapat menguji koneksi.' }, { status: 403 });
    }

    const bot = await getLineBot();
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN || bot.channel_access_token;

    if (!token || token.includes('demo') || token.includes('dummy')) {
      return NextResponse.json({
        success: false,
        error: 'Channel Access Token belum dikonfigurasi atau masih menggunakan dummy. Masukkan token resmi dari LINE Developers Console.',
      }, { status: 400 });
    }

    // Call official LINE API endpoint to verify bot info
    const lineRes = await fetch('https://api.line.me/v2/bot/info', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (lineRes.ok) {
      const lineData = await lineRes.json();
      await updateLineBot({ status: 'connected' });
      return NextResponse.json({
        success: true,
        message: `Koneksi LINE Messaging API Terverifikasi Aktif & Siap Siaran! (Bot: ${lineData.displayName} - Basic ID: ${lineData.basicId})`,
        botInfo: lineData,
      });
    } else {
      const errJson = await lineRes.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: `Gagal verifikasi ke LINE (HTTP ${lineRes.status}): ${errJson.message || 'Token tidak valid'}`,
      }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Gagal menghubungi server LINE' }, { status: 500 });
  }
}
