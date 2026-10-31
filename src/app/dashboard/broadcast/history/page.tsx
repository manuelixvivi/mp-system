'use client';

import React, { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { BroadcastDelivery } from '@/types';
import {
  History,
  BookOpen,
  Gift,
  CheckCircle2,
  AlertCircle,
  Filter,
  Search,
  Radio,
  Clock,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export default function BroadcastHistoryPage() {
  const { currentRole, loading: roleLoading } = useRole();
  const [deliveries, setDeliveries] = useState<BroadcastDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState<'all' | 'devotional' | 'birthday'>('all');
  const [filterType, setFilterType] = useState<'all' | 'scheduled' | 'manual'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-selection states for Superadmin deletion
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'selected' | 'all'>('selected');
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadDeliveries = async () => {
    try {
      const res = await fetch('/api/broadcast/history');
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data.deliveries || []);
      }
    } catch (err) {
      console.error('Failed fetching broadcast history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveries();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const isSuperadmin = currentRole === 'superadmin';

  // Filtered deliveries
  const filtered = deliveries.filter((item) => {
    const matchModule = filterModule === 'all' || item.module === filterModule;
    const matchType = filterType === 'all' || item.delivery_type === filterType;
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      (item.group_name || '').toLowerCase().includes(q) ||
      (item.line_group_id || '').toLowerCase().includes(q) ||
      (item.sender_name || '').toLowerCase().includes(q) ||
      (item.idempotency_key || '').toLowerCase().includes(q) ||
      (item.status || '').toLowerCase().includes(q);

    return matchModule && matchType && matchQuery;
  });

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const currentFilteredIds = filtered.map((d) => d.id);
    const areAllSelected =
      currentFilteredIds.length > 0 &&
      currentFilteredIds.every((id) => selectedIds.includes(id));

    if (areAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentFilteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentFilteredIds])));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      let res: Response;
      if (deleteMode === 'all') {
        res = await fetch('/api/broadcast/history?action=clear_all', {
          method: 'DELETE',
        });
      } else {
        res = await fetch('/api/broadcast/history', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedIds }),
        });
      }

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Riwayat broadcast berhasil dihapus.');
        setSelectedIds([]);
        setShowDeleteModal(false);
        loadDeliveries();
      } else {
        alert(data.error || 'Gagal menghapus riwayat broadcast.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi saat menghapus.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleQuickDeleteSingle = (id: string) => {
    setSelectedIds([id]);
    setDeleteMode('selected');
    setShowDeleteModal(true);
  };

  const handleOpenClearAll = () => {
    setDeleteMode('all');
    setShowDeleteModal(true);
  };

  const isAllFilteredSelected =
    filtered.length > 0 && filtered.every((d) => selectedIds.includes(d.id));

  const formatWibTime = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(d) + ' WIB';
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-md animate-in slide-in-from-top-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-red-50 text-red-800 border-red-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-700">
            &times;
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full font-medium inline-flex mb-2">
            <History className="w-3.5 h-3.5 text-blue-600" />
            <span>Riwayat & Status Pengiriman Broadcast</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Broadcast History</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar lengkap seluruh siaran terjadwal maupun manual yang dikirimkan ke grup LINE beserta kunci idempotensi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Superadmin Clear All Button */}
          {isSuperadmin && deliveries.length > 0 && (
            <button
              onClick={handleOpenClearAll}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold transition-all active:scale-95"
              title="Bersihkan seluruh riwayat broadcast"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bersihkan Seluruh Riwayat</span>
            </button>
          )}

          {/* Module Filter buttons */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setFilterModule('all')}
              className={`px-3 py-1.5 font-semibold rounded-lg transition-all ${
                filterModule === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterModule('devotional')}
              className={`px-3 py-1.5 font-semibold rounded-lg transition-all ${
                filterModule === 'devotional'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Devotional
            </button>
            <button
              onClick={() => setFilterModule('birthday')}
              className={`px-3 py-1.5 font-semibold rounded-lg transition-all ${
                filterModule === 'birthday'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Birthday
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari Grup, Pengirim, Idempotency Key..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div className="flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none font-medium bg-white"
            >
              <option value="all">Semua Tipe Siaran</option>
              <option value="scheduled">Terjadwal (Cron)</option>
              <option value="manual">Siaran Manual</option>
            </select>
          </div>
        </div>

        {/* Master Select for Superadmin */}
        {isSuperadmin && (
          <div className="flex items-center space-x-2 justify-end border-t md:border-t-0 pt-2 md:pt-0">
            <button
              onClick={handleSelectAll}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold transition-all text-xs"
            >
              {isAllFilteredSelected ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>{isAllFilteredSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Floating Bulk Action Bar (When items selected) */}
      {isSuperadmin && selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-3">
            <span className="w-6 h-6 rounded-full bg-blue-500 text-white font-extrabold flex items-center justify-center text-xs">
              {selectedIds.length}
            </span>
            <div>
              <p className="text-xs font-bold font-mono">
                {selectedIds.length} Riwayat Broadcast Terpilih
              </p>
              <p className="text-[11px] text-slate-400">
                Hapus riwayat yang dipilih dari catatan sistem.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleClearSelection}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-medium"
            >
              Batalkan Seleksi
            </button>
            <button
              onClick={() => {
                setDeleteMode('selected');
                setShowDeleteModal(true);
              }}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus {selectedIds.length} Riwayat Terpilih</span>
            </button>
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                {isSuperadmin && (
                  <th className="px-4 py-3 w-10 text-center">
                    <button onClick={handleSelectAll} title="Pilih Semua">
                      {isAllFilteredSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                )}
                <th className="px-5 py-3">Modul & Konten</th>
                <th className="px-5 py-3">Grup LINE Tujuan</th>
                <th className="px-5 py-3">Tipe & Jalur</th>
                <th className="px-5 py-3">Pengirim / Trigger</th>
                <th className="px-5 py-3">Waktu (WIB)</th>
                <th className="px-5 py-3">Status</th>
                {isSuperadmin && <th className="px-5 py-3 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={isSuperadmin ? 8 : 6} className="text-center py-10 text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span>Memuat riwayat broadcast...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={isSuperadmin ? 8 : 6} className="text-center py-12 text-slate-400 font-mono">
                    TIDAK ADA RIWAYAT BROADCAST DITEMUKAN.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      {isSuperadmin && (
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelect(item.id)}
                            className="text-slate-400 hover:text-blue-600"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                        </td>
                      )}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center space-x-2.5">
                          <div
                            className={`p-2 rounded-lg ${
                              item.module === 'devotional'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {item.module === 'devotional' ? (
                              <BookOpen className="w-4 h-4" />
                            ) : (
                              <Gift className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 capitalize">
                              {item.module === 'devotional' ? 'Daily Devotional' : 'Birthday Greeting'}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]" title={item.idempotency_key}>
                              Key: {item.idempotency_key}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-800">{item.group_name || 'Grup Komunitas'}</p>
                        <p className="font-mono text-[10px] text-slate-400 truncate max-w-[140px]">{item.line_group_id}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full inline-block ${
                            item.delivery_type === 'scheduled'
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : 'bg-purple-100 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {item.delivery_type.toUpperCase()} ({item.sender_channel})
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 font-medium">
                        {item.sender_name || 'System Scheduler'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {formatWibTime(item.delivered_at)}
                      </td>
                      <td className="px-5 py-3.5">
                        {item.status === 'success' ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Terkirim</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
                            <AlertCircle className="w-3 h-3 text-red-600" />
                            <span>Gagal</span>
                          </span>
                        )}
                      </td>
                      {isSuperadmin && (
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => handleQuickDeleteSingle(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus Riwayat Ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 font-sans">
            <div className="flex items-center space-x-3 text-red-600 pb-3 border-b border-slate-100">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {deleteMode === 'all'
                    ? 'Bersihkan Seluruh Riwayat Broadcast'
                    : 'Konfirmasi Hapus Riwayat Broadcast'}
                </h3>
                <p className="text-xs text-slate-500">
                  {deleteMode === 'all'
                    ? `${deliveries.length} data riwayat broadcast akan dihapus`
                    : `${selectedIds.length} data riwayat broadcast terpilih`}
                </p>
              </div>
            </div>

            <p className="py-4 text-xs text-slate-600 leading-relaxed">
              {deleteMode === 'all'
                ? 'Apakah Anda yakin ingin menghapus SELURUH riwayat broadcast dari sistem? Tindakan ini permanen dan tidak dapat dipulihkan.'
                : `Apakah Anda yakin ingin menghapus ${selectedIds.length} data riwayat broadcast yang dipilih?`}
            </p>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center space-x-1.5"
              >
                {isDeleting ? (
                  <span>Menghapus...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      {deleteMode === 'all' ? 'Ya, Bersihkan Semua' : `Ya, Hapus ${selectedIds.length} Riwayat`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
