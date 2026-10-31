import { NextRequest, NextResponse } from 'next/server';
import {
  getDeliveries,
  deleteDelivery,
  deleteDeliveriesBulk,
  clearAllDeliveries,
  getProfileByEmail,
  addActivityLog,
} from '@/lib/db/store';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth/session';

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

export async function GET(req: NextRequest) {
  const user = await getAuthorizedUser(req);
  if (!user) {
    return NextResponse.json(
      { error: 'Akses ditolak: Anda belum terautentikasi.' },
      { status: 401 }
    );
  }

  const deliveries = await getDeliveries();
  return NextResponse.json({ deliveries });
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthorizedUser(req);
  if (!user) {
    return NextResponse.json(
      { error: 'Akses ditolak: Anda belum terautentikasi.' },
      { status: 401 }
    );
  }

  // Only Superadmin can delete broadcast history
  if (user.role !== 'superadmin') {
    return NextResponse.json(
      { error: 'Akses ditolak: Hanya Superadmin yang berwenang menghapus riwayat broadcast.' },
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

    // 1. Clear All History
    if (queryAction === 'clear_all' || body?.action === 'clear_all') {
      const result = clearAllDeliveries();
      addActivityLog({
        user_id: user.id,
        user_name: user.name,
        actor_type: 'user',
        action: 'broadcast_history_cleared',
        entity_type: 'broadcast_delivery',
        details: { count: result.count, cleared_by: user.email },
      });

      return NextResponse.json({
        success: true,
        count: result.count,
        message: `Seluruh riwayat broadcast (${result.count} data) berhasil dibersihkan.`,
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
        { error: 'Pilih setidaknya 1 riwayat broadcast untuk dihapus.' },
        { status: 400 }
      );
    }

    if (idsToDelete.length === 1) {
      const singleId = idsToDelete[0];
      const deleted = deleteDelivery(singleId);
      if (!deleted) {
        return NextResponse.json({ error: 'Riwayat broadcast tidak ditemukan.' }, { status: 404 });
      }

      addActivityLog({
        user_id: user.id,
        user_name: user.name,
        actor_type: 'user',
        action: 'broadcast_history_deleted',
        entity_type: 'broadcast_delivery',
        entity_id: singleId,
        details: { deleted_by: user.email },
      });

      return NextResponse.json({
        success: true,
        count: 1,
        message: '1 riwayat broadcast berhasil dihapus.',
      });
    }

    // Multiple IDs
    const result = deleteDeliveriesBulk(idsToDelete);
    addActivityLog({
      user_id: user.id,
      user_name: user.name,
      actor_type: 'user',
      action: 'broadcast_history_bulk_deleted',
      entity_type: 'broadcast_delivery',
      details: {
        requestedCount: idsToDelete.length,
        deletedCount: result.count,
        deletedIds: result.deletedIds,
        deleted_by: user.email,
      },
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      deletedIds: result.deletedIds,
      message: `${result.count} riwayat broadcast berhasil dihapus.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Terjadi kesalahan sistem saat menghapus riwayat.' },
      { status: 500 }
    );
  }
}
