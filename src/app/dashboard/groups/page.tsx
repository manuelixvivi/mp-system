'use client';

import React, { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { LineGroup } from '@/types';
import {
  Users,
  Plus,
  BookOpen,
  Gift,
  CheckCircle,
  Radio,
  ExternalLink,
  Trash2,
  Search,
  AlertTriangle,
  Layers,
} from 'lucide-react';

export default function GroupManagementPage() {
  const { currentRole } = useRole();
  const [groups, setGroups] = useState<LineGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Group Form
  const [groupId, setGroupId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [memberCount, setMemberCount] = useState('30');
  const [assignDevotional, setAssignDevotional] = useState(true);
  const [assignBirthday, setAssignBirthday] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      const data = await res.json();
      setGroups(data.groups || []);
    } catch (err) {
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!groupId || !groupName) return;

    const assignedModules: ('devotional' | 'birthday')[] = [];
    if (assignDevotional) assignedModules.push('devotional');
    if (assignBirthday) assignedModules.push('birthday');

    setSubmitting(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: groupId.trim(),
          group_name: groupName.trim(),
          description: description.trim(),
          assigned_modules: assignedModules,
          member_count: Number(memberCount) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menambahkan grup LINE.');
      }

      setShowAddModal(false);
      setGroupId('');
      setGroupName('');
      setDescription('');
      setMemberCount('30');
      setAssignDevotional(true);
      setAssignBirthday(true);
      setSuccessMessage(`Grup LINE "${data.group?.group_name}" berhasil didaftarkan.`);
      loadGroups();
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGroup = async (group: LineGroup) => {
    if (currentRole !== 'superadmin') {
      alert('Hanya Superadmin yang berwenang menghapus grup LINE.');
      return;
    }

    const confirmText = `Apakah Anda yakin ingin menghapus grup "${group.group_name}" (${group.group_id}) dari sistem?\n\nBot tidak akan lagi mengirimkan broadcast otomatis maupun manual ke grup ini.`;
    if (!confirm(confirmText)) {
      return;
    }

    try {
      const res = await fetch(`/api/groups?id=${group.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus grup.');
      }

      setSuccessMessage(`Grup LINE "${group.group_name}" berhasil dihapus.`);
      loadGroups();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat menghapus grup.');
    }
  };

  const filteredGroups = groups.filter((g) => {
    const q = searchQuery.toLowerCase();
    return (
      g.group_name.toLowerCase().includes(q) ||
      g.group_id.toLowerCase().includes(q) ||
      (g.description && g.description.toLowerCase().includes(q))
    );
  });

  const totalMembers = groups.reduce((acc, curr) => acc + (curr.member_count || 0), 0);
  const devotionalGroupsCount = groups.filter((g) => g.assigned_modules.includes('devotional')).length;
  const birthdayGroupsCount = groups.filter((g) => g.assigned_modules.includes('birthday')).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full font-medium inline-flex mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Target LINE Groups • Broadcast-Only Mode</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Manajemen Grup LINE</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftarkan grup LINE resmi komunitas MP dan tentukan modul siaran yang ditugaskan untuk masing-masing grup.
          </p>
        </div>

        {currentRole === 'superadmin' && (
          <button
            onClick={() => {
              setErrorMessage(null);
              setShowAddModal(true);
            }}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Grup Baru</span>
          </button>
        )}
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-start space-x-3 text-xs animate-in fade-in duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{successMessage}</div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-500 hover:text-emerald-800 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Grup</p>
            <p className="text-xl font-bold text-slate-900">{groups.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Grup Devotional</p>
            <p className="text-xl font-bold text-slate-900">{devotionalGroupsCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Grup Birthday</p>
            <p className="text-xl font-bold text-slate-900">{birthdayGroupsCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Estimasi Anggota</p>
            <p className="text-xl font-bold text-slate-900">{totalMembers} <span className="text-xs font-normal text-slate-500">Orang</span></p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama grup atau Group ID..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>
        <p className="text-xs text-slate-500">
          Menampilkan <span className="font-semibold text-slate-800">{filteredGroups.length}</span> dari {groups.length} grup
        </p>
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400 text-xs">
          Memuat daftar grup LINE...
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400 text-xs">
          Tidak ada grup yang sesuai dengan pencarian Anda.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {filteredGroups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition-all group relative"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded">
                    {group.group_id}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                      Broadcast-Only
                    </span>
                    {currentRole === 'superadmin' && (
                      <button
                        onClick={() => handleDeleteGroup(group)}
                        className="p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Hapus Grup LINE"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <h3 className="font-bold text-slate-900 text-sm leading-snug">{group.group_name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-[32px]">{group.description || 'Tidak ada deskripsi tambahan.'}</p>
                  <p className="text-xs text-slate-400 mt-2 font-medium">
                    Anggota: <strong className="text-slate-700">{group.member_count} Orang</strong>
                  </p>
                </div>

                {/* Modules Badges */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Modul Ditugaskan:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {group.assigned_modules.includes('devotional') && (
                      <span className="inline-flex items-center space-x-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-medium">
                        <BookOpen className="w-3 h-3" />
                        <span>Daily Devotional</span>
                      </span>
                    )}
                    {group.assigned_modules.includes('birthday') && (
                      <span className="inline-flex items-center space-x-1 bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-medium">
                        <Gift className="w-3 h-3" />
                        <span>Birthday Mention</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">Status: Aktif</span>
                <span className="text-emerald-600 font-medium text-[11px] flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                  <span>Bot Tergabung</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Group Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Daftarkan Grup LINE Baru</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            {errorMessage && (
              <div className="mt-3 p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleAddGroup} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">LINE Group ID *</label>
                <input
                  type="text"
                  required
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  placeholder="Contoh: c_mp_family_004"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Grup LINE *</label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Contoh: Grup OMK Wilayah Barat"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Perkiraan Jumlah Anggota</label>
                <input
                  type="number"
                  value={memberCount}
                  onChange={(e) => setMemberCount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi Grup</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Keterangan grup..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-2">Modul yang Ditugaskan</label>
                <div className="space-y-1.5">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assignDevotional}
                      onChange={(e) => setAssignDevotional(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Daily Devotional (Coffee Break with God - 09:45 WIB)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assignBirthday}
                      onChange={(e) => setAssignBirthday(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Birthday Automation (Mention Ultah - 07:00 WIB)</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Grup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
