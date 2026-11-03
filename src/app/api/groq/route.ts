import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { getAutomationSettings, updateAutomationSettings, getProfileByEmail, addActivityLog } from '@/lib/db/store';
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

// GET: Get current Groq configuration or fetch live models
export async function GET(req: NextRequest) {
  try {
    const admin = await getSuperadmin(req);
    if (!admin) {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya Superadmin yang berhak mengakses pengaturan Groq API.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const providedKey = searchParams.get('key');

    const settings = await getAutomationSettings();
    const envKey = process.env.GROQ_API_KEY || '';
    const activeKey = providedKey || envKey || settings.groq_api_key || '';

    // If requested to fetch live models from Groq
    if (action === 'models') {
      if (!activeKey || activeKey.trim().length < 8) {
        return NextResponse.json(
          { error: 'GROQ_API_KEY belum dikonfigurasi. Masukkan API key Groq terlebih dahulu.' },
          { status: 400 }
        );
      }

      try {
        const client = new Groq({ apiKey: activeKey.trim() });
        const modelsList = await client.models.list();

        // Sort models nicely with llama-3.3 and recommended models at the top
        const sorted = (modelsList.data || []).sort((a: any, b: any) => {
          if (a.id.includes('llama-3.3')) return -1;
          if (b.id.includes('llama-3.3')) return 1;
          if (a.id.includes('llama-3.1')) return -1;
          if (b.id.includes('llama-3.1')) return 1;
          return a.id.localeCompare(b.id);
        });

        return NextResponse.json({
          success: true,
          models: sorted.map((m: any) => ({
            id: m.id,
            owned_by: m.owned_by,
            active: m.active,
          })),
        });
      } catch (groqErr: any) {
        return NextResponse.json(
          {
            error: `Gagal mengambil model dari Groq: ${groqErr.message || 'API Key tidak valid atau kendala jaringan'}`,
          },
          { status: 400 }
        );
      }
    }

    // Default: return current Groq settings (masked)
    const maskKey = (key: string) => {
      if (!key || key.length < 8) return '';
      return key.slice(0, 6) + '••••••••••••••••' + key.slice(-4);
    };

    return NextResponse.json({
      success: true,
      config: {
        groq_api_key_masked: maskKey(activeKey),
        groq_model: settings.groq_model || 'llama-3.3-70b-versatile',
        is_configured: !!(activeKey && activeKey.length > 8),
        source: envKey ? 'environment_variable' : settings.groq_api_key ? 'database_store' : 'none',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// PUT: Save or update Groq API Key and Model
export async function PUT(req: NextRequest) {
  try {
    const admin = await getSuperadmin(req);
    if (!admin) {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya Superadmin yang berhak mengubah pengaturan Groq API.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { groq_api_key, groq_model } = body;

    const updates: any = {};
    if (groq_model) updates.groq_model = groq_model;

    // Only update key if user did not pass the masked dots
    if (groq_api_key && !groq_api_key.includes('••••')) {
      updates.groq_api_key = groq_api_key.trim();
    }

    const updated = await updateAutomationSettings(updates);

    addActivityLog({
      user_id: admin.id,
      user_name: admin.name,
      actor_type: 'user',
      action: 'groq_api_configured',
      entity_type: 'system',
      entity_id: 'groq_ai',
      details: { model: updated.groq_model, has_key: !!updated.groq_api_key },
    });

    return NextResponse.json({
      success: true,
      message: 'Pengaturan Groq API & Model berhasil disimpan!',
      groq_model: updated.groq_model,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// POST: Test Groq Chat Completion with sample Catholic prompt
export async function POST(req: NextRequest) {
  try {
    const admin = await getSuperadmin(req);
    if (!admin) {
      return NextResponse.json(
        { error: 'Akses ditolak: Hanya Superadmin yang berhak menguji Groq API.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const settings = await getAutomationSettings();
    const activeKey = body.groq_api_key || process.env.GROQ_API_KEY || settings.groq_api_key;
    const activeModel = body.groq_model || settings.groq_model || 'llama-3.3-70b-versatile';

    if (!activeKey || activeKey.trim().length < 8) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY belum dikonfigurasi. Masukkan API key terlebih dahulu.' },
        { status: 400 }
      );
    }

    const client = new Groq({ apiKey: activeKey.trim() });
    const completion = await client.chat.completions.create({
      model: activeModel,
      messages: [
        {
          role: 'system',
          content: 'Anda adalah asisten AI komunitas katolik. Balas dengan singkat dalam bahasa Indonesia.',
        },
        {
          role: 'user',
          content: 'Uji koneksi sistem MP. Berikan 1 ayat berkat singkat untuk hari ini.',
        },
      ],
      temperature: 0.3,
      max_tokens: 150,
    });

    const reply = completion.choices[0]?.message?.content || 'Koneksi berhasil tanpa pesan balasan.';

    return NextResponse.json({
      success: true,
      message: `Koneksi Groq API Terverifikasi Aktif menggunakan model [${activeModel}]!`,
      sampleReply: reply,
      usage: completion.usage,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Uji coba Groq gagal: ${err.message || 'Periksa API Key atau pilihan model Anda.'}` },
      { status: 400 }
    );
  }
}
