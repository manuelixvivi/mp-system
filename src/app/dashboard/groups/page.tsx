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
} from 'lucide-react';

export default function GroupManagementPage() {
  const { currentRole } = useRole();
  const [groups, setGroups] = useState<LineGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Group Form
  const [groupId, setGroupId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [memberCount, setMemberCount] = useState('30');
  const [assignDevotional, setAssignDevotional] = useState(true);
  const [assignBirthday, setAssignBirthday] = useState(true);

  const loadGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      const data = await res.json();
      setGroups(data.groups || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !groupName) return;

    const assignedModules: ('devotional' | 'birthday')[] = [];
    if (assignDevotional) assignedModules.push('devotional');
    if (assignBirthday) assignedModules.push('birthday');

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: groupId,
          group_name: groupName,
          description,
          assigned_modules: assignedModules,
          member_count: Number(memberCount),
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setGroupId('');
        setGroupName('');
        setDescription('');
        loadGroups();
      }
    } catch (err) {
      console.error(err);
    }
  };

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
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Grup Baru</span>
          </button>
        )}
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {groups.map((group) => (
          <div
            key={group.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition-all"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded">
                  {group.group_id}
                </span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                  Broadcast-Only
                </span>
              </div>

              <div className="mt-3">
                <h3 className="font-bold text-slate-900 text-sm">{group.group_name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{group.description}</p>
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
              <span className="text-emerald-600 font-medium text-[11px]">Bot Tergabung</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Group Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Daftarkan Grup LINE Baru</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                &times;
              </button>
            </div>

            <form onSubmit={handleAddGroup} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">LINE Group ID *</label>
                <input
                  type="text"
                  required
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  placeholder="Contoh: c-mp-youth-004"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none font-mono"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Perkiraan Jumlah Anggota</label>
                <input
                  type="number"
                  value={memberCount}
                  onChange={(e) => setMemberCount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi Grup</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Keterangan grup..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
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
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 shadow-sm"
                >
                  Simpan Grup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
