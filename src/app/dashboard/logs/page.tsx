'use client';

import React, { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { ActivityLog } from '@/types';
import {
  FileText,
  Shield,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Code,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Bot,
  User,
  Cpu,
} from 'lucide-react';

export default function ActivityLogsPage() {
  const { currentRole, currentUser, loading: roleLoading } = useRole();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActorType, setFilterActorType] = useState<'all' | 'user' | 'line_bot' | 'system_scheduler'>('all');
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  // Multi-selection states for Superadmin deletion
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'selected' | 'all'>('selected');
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        if (data.logs?.length > 0 && !selectedLog) {
          setSelectedLog(data.logs[0]);
        }
      }
    } catch (err) {
      console.error('Failed fetching activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!roleLoading && currentRole === 'superadmin') {
      loadLogs();
    }
  }, [roleLoading, currentRole]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const isSuperadmin = currentRole === 'superadmin';

  // Filter logs based on actor type and search query
  const filtered = logs.filter((log) => {
    const matchActor = filterActorType === 'all' || log.actor_type === filterActorType;
    const q = searchQuery.toLowerCase().trim();
    const detailsStr = log.details ? JSON.stringify(log.details).toLowerCase() : '';
    const matchQuery =
      !q ||
      (log.user_name || '').toLowerCase().includes(q) ||
      (log.action || '').toLowerCase().includes(q) ||
      (log.entity_type || '').toLowerCase().includes(q) ||
      (log.actor_type || '').toLowerCase().includes(q) ||
      detailsStr.includes(q);

    return matchActor && matchQuery;
  });

  // Selection handlers
  const handleToggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const currentFilteredIds = filtered.map((l) => l.id);
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
        res = await fetch('/api/logs?action=clear_all', {
          method: 'DELETE',
        });
      } else {
        res = await fetch('/api/logs', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedIds }),
        });
      }

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Log aktivitas berhasil dihapus.');
        if (selectedLog && selectedIds.includes(selectedLog.id)) {
          setSelectedLog(null);
        }
        setSelectedIds([]);
        setShowDeleteModal(false);
        loadLogs();
      } else {
        alert(data.error || 'Gagal menghapus log aktivitas.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi saat menghapus log.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleQuickDeleteSingle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds([id]);
    setDeleteMode('selected');
    setShowDeleteModal(true);
  };

  const handleOpenClearAll = () => {
    setDeleteMode('all');
    setShowDeleteModal(true);
  };

  const isAllFilteredSelected =
    filtered.length > 0 && filtered.every((l) => selectedIds.includes(l.id));

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

  const getActorBadge = (actorType: string) => {
    switch (actorType) {
      case 'user':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <User className="w-2.5 h-2.5" />
            <span>Petugas</span>
          </span>
        );
      case 'line_bot':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Bot className="w-2.5 h-2.5" />
            <span>LINE Bot</span>
          </span>
        );
      case 'system_scheduler':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Cpu className="w-2.5 h-2.5" />
            <span>Cron Sistem</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
            <span>{actorType}</span>
          </span>
        );
    }
  };

  if (roleLoading) {
    return (
      <div className="bg-white p-12 rounded-xl border border-slate-200 text-center max-w-lg mx-auto mt-12 space-y-3 font-sans">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-slate-500 font-medium">Memverifikasi hak akses Superadmin...</p>
      </div>
    );
  }

  if (currentRole !== 'superadmin') {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center max-w-lg mx-auto mt-12 space-y-3 font-sans">
        <Shield className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Akses Dibatasi Khusus Superadmin</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Halaman Activity Logs hanya dapat diakses oleh Superadmin untuk audit kepatuhan dan pelacakan seluruh peristiwa sistem.
        </p>
      </div>
    );
  }

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
            <FileText className="w-3.5 h-3.5 text-purple-600" />
            <span>Audit Trail & Activity Logging • Superadmin Exclusive</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Activity Logs</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log seluruh aktivitas sistem, webhook command LINE, pengiriman broadcast, dan aksi audit konten.
          </p>
        </div>

        {/* Clear All Logs Button */}
        {logs.length > 0 && (
          <button
            onClick={handleOpenClearAll}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold transition-all active:scale-95"
            title="Bersihkan seluruh riwayat log"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Bersihkan Seluruh Log</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari Aktor, Aksi, Entitas, Rincian..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
            />
          </div>

          <div className="flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterActorType}
              onChange={(e) => setFilterActorType(e.target.value as any)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none font-medium bg-white"
            >
              <option value="all">Semua Tipe Aktor</option>
              <option value="user">Petugas / User</option>
              <option value="line_bot">LINE Bot Webhook</option>
              <option value="system_scheduler">System Scheduler (Cron)</option>
            </select>
          </div>
        </div>

        {/* Master Select */}
        <div className="flex items-center space-x-2 justify-end border-t md:border-t-0 pt-2 md:pt-0">
          <button
            onClick={handleSelectAll}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold transition-all text-xs"
          >
            {isAllFilteredSelected ? (
              <CheckSquare className="w-4 h-4 text-purple-600" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>{isAllFilteredSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}</span>
          </button>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-3">
            <span className="w-6 h-6 rounded-full bg-purple-500 text-white font-extrabold flex items-center justify-center text-xs">
              {selectedIds.length}
            </span>
            <div>
              <p className="text-xs font-bold font-mono">
                {selectedIds.length} Log Aktivitas Terpilih
              </p>
              <p className="text-[11px] text-slate-400">
                Hapus log yang dipilih dari catatan audit sistem.
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
              <span>Hapus {selectedIds.length} Log Terpilih</span>
            </button>
          </div>
        </div>
      )}

      {/* Grid: Table on Left + Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Logs Table */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3 w-10 text-center">
                    <button onClick={handleSelectAll} title="Pilih Semua">
                      {isAllFilteredSelected ? (
                        <CheckSquare className="w-4 h-4 text-purple-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="px-5 py-3">Aktor / Pengguna</th>
                  <th className="px-5 py-3">Aksi & Entitas</th>
                  <th className="px-5 py-3">Waktu (WIB)</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">
                      <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <span>Memuat log aktivitas...</span>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400 font-mono">
                      TIDAK ADA LOG AKTIVITAS DITEMUKAN.
                    </td>
                  </tr>
                ) : (
                  filtered.map((log) => {
                    const isSelected = selectedIds.includes(log.id);
                    const isInspected = selectedLog?.id === log.id;
                    return (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                          isInspected ? 'bg-purple-50/50 border-l-4 border-l-purple-600' : ''
                        } ${isSelected ? 'bg-blue-50/40' : ''}`}
                      >
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={(e) => handleToggleSelect(log.id, e)}
                            className="text-slate-400 hover:text-purple-600"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-purple-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-slate-900">{log.user_name || 'System'}</p>
                          <div className="mt-0.5">{getActorBadge(log.actor_type)}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-mono text-purple-700 font-semibold">{log.action}</p>
                          <p className="text-[11px] text-slate-500 capitalize">
                            Entitas: {log.entity_type} {log.entity_id ? `(${log.entity_id})` : ''}
                          </p>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {formatWibTime(log.created_at)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLog(log);
                              }}
                              className="px-2 py-1 text-[11px] text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded font-medium"
                            >
                              JSON
                            </button>
                            <button
                              onClick={(e) => handleQuickDeleteSingle(log.id, e)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Hapus Log Ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (4 cols): JSON Payload Inspector */}
        <div className="lg:col-span-4 bg-slate-900 text-white rounded-xl p-5 shadow-lg border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800 mb-3 text-purple-400 font-mono">
              <Code className="w-4 h-4" />
              <h3 className="font-bold text-xs uppercase tracking-wider">Audit Payload Inspector</h3>
            </div>

            {selectedLog ? (
              <div className="space-y-3 font-sans text-xs">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <p className="text-[10px] text-slate-400 font-mono">AKSI TERPILIH:</p>
                  <p className="font-mono text-purple-300 font-bold text-sm">{selectedLog.action}</p>
                  <p className="text-slate-400 text-[11px]">
                    Oleh: <strong className="text-slate-200">{selectedLog.user_name || 'System'}</strong> ({selectedLog.actor_type})
                  </p>
                  <p className="text-slate-500 text-[10px] font-mono">{formatWibTime(selectedLog.created_at)}</p>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 overflow-x-auto max-h-96">
                  <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {JSON.stringify(selectedLog.details || {}, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-xs text-slate-500">
                Klik salah satu baris log pada tabel untuk memeriksa JSON payload terperinci.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-400 mt-4">
            Log aktivitas dicatat secara otomatis untuk keamanan dan transparansi sistem.
          </div>
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
                    ? 'Bersihkan Seluruh Log Aktivitas'
                    : 'Konfirmasi Hapus Log Aktivitas'}
                </h3>
                <p className="text-xs text-slate-500">
                  {deleteMode === 'all'
                    ? `${logs.length} catatan audit log akan dihapus`
                    : `${selectedIds.length} catatan audit log terpilih`}
                </p>
              </div>
            </div>

            <p className="py-4 text-xs text-slate-600 leading-relaxed">
              {deleteMode === 'all'
                ? 'Apakah Anda yakin ingin menghapus SELURUH catatan audit log aktivitas dari sistem? Tindakan ini bersifat permanen.'
                : `Apakah Anda yakin ingin menghapus ${selectedIds.length} data catatan audit log yang dipilih?`}
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
                      {deleteMode === 'all' ? 'Ya, Bersihkan Semua' : `Ya, Hapus ${selectedIds.length} Log`}
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
