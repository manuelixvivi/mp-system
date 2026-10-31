import { NextRequest, NextResponse } from 'next/server';
import {
  getActivityLogs,
  deleteActivityLog,
  deleteActivityLogsBulk,
  clearAllActivityLogs,
  getProfileByEmail,
  addActivityLog,
} from '@/lib/db/store';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

async function getAuthorizedSuperadmin(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const sessionUser = await verifySessionToken(token);
  if (!sessionUser?.email) return null;

  const dbUser = await getProfileByEmail(sessionUser.email);
  if (!dbUser || !dbUser.is_active || dbUser.role !== 'superadmin') return null;

  return dbUser;
}

export async function GET(req: NextRequest) {
  const superadmin = await getAuthorizedSuperadmin(req);
  if (!superadmin) {
    return NextResponse.json(
      { error: 'Akses ditolak: Hanya Superadmin yang berhak melihat log aktivitas sistem.' },
      { status: 403 }
    );
  }

  const logs = await getActivityLogs();
  return NextResponse.json({ logs });
}

export async function DELETE(req: NextRequest) {
  const superadmin = await getAuthorizedSuperadmin(req);
  if (!superadmin) {
    return NextResponse.json(
      { error: 'Akses ditolak: Hanya Superadmin yang berwenang menghapus log aktivitas.' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const queryAction = searchParams.get('action');
    const queryId = searchParams.get('id');
    const queryIds = searchParams.get('ids');

    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      // Body may be empty if query params used
    }

    // 1. Clear All Logs
    if (queryAction === 'clear_all' || body?.action === 'clear_all') {
      const result = clearAllActivityLogs();
      // Record this administrative clear event as the first fresh log entry
      addActivityLog({
        user_id: superadmin.id,
        user_name: superadmin.name,
        actor_type: 'user',
        action: 'activity_logs_cleared',
        entity_type: 'activity_log',
        details: { count: result.count, cleared_by: superadmin.email },
      });

      return NextResponse.json({
        success: true,
        count: result.count,
        message: `Seluruh log aktivitas (${result.count} data) berhasil dibersihkan.`,
      });
    }

    // 2. Bulk Deletion by IDs
    let idsToDelete: string[] = [];
    if (queryIds) {
      idsToDelete = queryIds.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (Array.isArray(body?.ids)) {
      idsToDelete = body.ids.map((s: any) => String(s).trim()).filter(Boolean);
    } else if (queryId || body?.id) {
      idsToDelete = [String(queryId || body.id).trim()];
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json(
        { error: 'Pilih setidaknya 1 log aktivitas untuk dihapus.' },
        { status: 400 }
      );
    }

    if (idsToDelete.length === 1) {
      const singleId = idsToDelete[0];
      const deleted = deleteActivityLog(singleId);
      if (!deleted) {
        return NextResponse.json({ error: 'Log aktivitas tidak ditemukan.' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        count: 1,
        message: '1 data log aktivitas berhasil dihapus.',
      });
    }

    // Multiple IDs
    const result = deleteActivityLogsBulk(idsToDelete);
    return NextResponse.json({
      success: true,
      count: result.count,
      deletedIds: result.deletedIds,
      message: `${result.count} data log aktivitas berhasil dihapus.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Terjadi kesalahan sistem saat menghapus log.' },
      { status: 500 }
    );
  }
}
