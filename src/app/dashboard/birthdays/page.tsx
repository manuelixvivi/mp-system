'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import { Member, LineGroup } from '@/types';
import {
  Gift,
  Plus,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Edit2,
  Trash2,
  Calendar,
  Users,
  AtSign,
  Radio,
  Layers,
  Plane,
  Clock,
  Sparkles,
  ShieldCheck,
  Eye,
  Check,
  Copy,
} from 'lucide-react';

const MONTH_NAMES = [
  'Semua Bulan',
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const MONTH_SHORT = [
  '',
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MEI',
  'JUN',
  'JUL',
  'AGS',
  'SEP',
  'OKT',
  'NOV',
  'DES',
];

export default function BirthdayManagementPage() {
  const { currentRole } = useRole();
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<LineGroup[]>([]);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  const [activeBay, setActiveBay] = useState<'all' | 'today' | 'upcoming' | 'alert'>('all');
  const [viewMode, setViewMode] = useState<'fps' | 'table'>('fps');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStrip, setSelectedStrip] = useState<Member | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Member Form
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('1');
  const [birthMonth, setBirthMonth] = useState('1');
  const [birthYear, setBirthYear] = useState('');
  const [lineUserId, setLineUserId] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    try {
      const [memRes, grpRes] = await Promise.all([
        fetch('/api/members').then((r) => r.json()),
        fetch('/api/groups').then((r) => r.json()),
      ]);
      setMembers(memRes.members || []);
      setGroups(grpRes.groups || []);
      if (grpRes.groups?.length > 0) {
        setSelectedGroup(grpRes.groups[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !birthDate || !birthMonth) return;

    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          birth_date: Number(birthDate),
          birth_month: Number(birthMonth),
          birth_year: birthYear ? Number(birthYear) : undefined,
          line_user_id: lineUserId,
          assigned_groups: selectedGroup ? [selectedGroup] : [],
          notes,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setFullName('');
        setLineUserId('');
        setNotes('');
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Yakin ingin menghapus anggota ini dari strip bay?')) return;
    try {
      await fetch(`/api/members?id=${id}`, { method: 'DELETE' });
      if (selectedStrip?.id === id) setSelectedStrip(null);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper calculations for Flight Progress Strips
  const today = new Date();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const getMemberStatus = (member: Member) => {
    const isToday = member.birth_date === todayDate && member.birth_month === todayMonth;
    const hasLineId = Boolean(member.line_user_id && member.line_user_id.trim().length > 0);

    // Calculate days remaining
    let nextBday = new Date(currentYear, member.birth_month - 1, member.birth_date);
    if (nextBday < new Date(currentYear, todayMonth - 1, todayDate)) {
      nextBday = new Date(currentYear + 1, member.birth_month - 1, member.birth_date);
    }
    const diffTime = nextBday.getTime() - new Date(currentYear, todayMonth - 1, todayDate).getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isUpcoming = daysRemaining > 0 && daysRemaining <= 7;

    const age = member.birth_year ? currentYear - member.birth_year : null;

    return {
      isToday,
      isUpcoming,
      daysRemaining,
      hasLineId,
      age,
    };
  };

  // Filter members based on search, month, and Bay racks
  const filteredMembers = members.filter((m) => {
    const matchSearch =
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (m.line_user_id || '').toLowerCase().includes(search.toLowerCase());
    const matchMonth = selectedMonth === 0 || m.birth_month === selectedMonth;

    const { isToday, isUpcoming, hasLineId } = getMemberStatus(m);

    let matchBay = true;
    if (activeBay === 'today') matchBay = isToday;
    else if (activeBay === 'upcoming') matchBay = isUpcoming;
    else if (activeBay === 'alert') matchBay = !hasLineId;

    return matchSearch && matchMonth && matchBay;
  });

  // Bay counts
  const countToday = members.filter((m) => getMemberStatus(m).isToday).length;
  const countUpcoming = members.filter((m) => getMemberStatus(m).isUpcoming).length;
  const countAlert = members.filter((m) => !getMemberStatus(m).hasLineId).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full font-medium inline-flex mb-2">
            <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            <span>Birthday Progress Board • Flight Progress Strip (EFPS) Interface</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Daftar Ulang Tahun — Flight Progress Strip
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tampilan terpusat dengan gaya *Electronic Flight Progress Strip* (EFPS) untuk memantau status antrean ulang tahun, verifikasi squawk LINE ID, dan jadwal siaran 07:00 WIB.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setViewMode('fps')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'fps'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Strip Bay (EFPS)</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Tabel Klasik</span>
            </button>
          </div>

          <Link
            href="/dashboard/birthdays/calendar"
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-all"
          >
            <Calendar className="w-4 h-4" />
            <span>Kalender</span>
          </Link>

          {(currentRole === 'superadmin' || currentRole === 'logistik') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Anggota</span>
            </button>
          )}
        </div>
      </div>

      {/* ATC Rack / Bay Tabs Header */}
      <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-3 text-white">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
            EFPS STRIP RACK // TWR 07:00 WIB
          </span>
        </div>

        {/* Rack Selector Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveBay('all')}
            className={`px-3 py-1 rounded-lg border transition-all ${
              activeBay === 'all'
                ? 'bg-emerald-600 border-emerald-500 text-white font-bold'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            ALL STRIPS ({members.length})
          </button>
          <button
            onClick={() => setActiveBay('today')}
            className={`px-3 py-1 rounded-lg border transition-all flex items-center space-x-1.5 ${
              activeBay === 'today'
                ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-extrabold'
                : 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
            <span>BAY 1: TODAY ({countToday})</span>
          </button>
          <button
            onClick={() => setActiveBay('upcoming')}
            className={`px-3 py-1 rounded-lg border transition-all flex items-center space-x-1.5 ${
              activeBay === 'upcoming'
                ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-extrabold'
                : 'bg-slate-800 border-slate-700 text-cyan-400 hover:bg-slate-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
            <span>BAY 2: QUEUE 7D ({countUpcoming})</span>
          </button>
          <button
            onClick={() => setActiveBay('alert')}
            className={`px-3 py-1 rounded-lg border transition-all flex items-center space-x-1.5 ${
              activeBay === 'alert'
                ? 'bg-amber-500 border-amber-400 text-slate-950 font-extrabold'
                : 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse"></span>
            <span>BAY 3: NO SQUAWK ({countAlert})</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
        <div className="flex items-center space-x-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari Callsign, Nama, atau LINE User ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>

          <div className="flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none font-medium"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={idx} value={idx}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          STATUS: <strong className="text-slate-800">{filteredMembers.length} STRIPS ON SCREEN</strong>
        </div>
      </div>

      {/* VIEW MODE 1: FLIGHT PROGRESS STRIPS (EFPS ATC RACK VIEW) */}
      {viewMode === 'fps' ? (
        <div className="space-y-3">
          {filteredMembers.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-sm font-mono text-xs text-slate-400">
              NO FLIGHT PROGRESS STRIPS FOUND MATCHING CURRENT FILTER CRITERIA.
            </div>
          ) : (
            filteredMembers.map((member, idx) => {
              const { isToday, isUpcoming, daysRemaining, hasLineId, age } = getMemberStatus(member);
              const assignedGroupName =
                groups.find((g) => member.assigned_groups?.includes(g.id))?.group_name || 'Grup Inti MP';

              // Strip accent colors
              let borderAccent = 'border-l-slate-400';
              let stripBg = 'bg-white';
              let badgeColor = 'bg-slate-100 text-slate-700';

              if (isToday) {
                borderAccent = 'border-l-emerald-500';
                stripBg = 'bg-emerald-50/20';
                badgeColor = 'bg-emerald-600 text-white animate-pulse';
              } else if (!hasLineId) {
                borderAccent = 'border-l-amber-500';
                stripBg = 'bg-amber-50/20';
                badgeColor = 'bg-amber-500 text-slate-950 font-bold';
              } else if (isUpcoming) {
                borderAccent = 'border-l-cyan-500';
                stripBg = 'bg-cyan-50/20';
                badgeColor = 'bg-cyan-600 text-white';
              }

              return (
                <div
                  key={member.id}
                  className={`${stripBg} border border-slate-300/80 rounded-xl shadow-sm hover:shadow-md transition-all font-mono text-xs overflow-hidden border-l-[8px] ${borderAccent} flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-200/80 hover:border-slate-400 group`}
                >
                  {/* CELL 1: CALLSIGN / IDENTITY */}
                  <div className="p-3.5 lg:w-64 flex-shrink-0 flex flex-col justify-between bg-slate-50/60">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1">
                      <span>CALLSIGN // ID</span>
                      <span className="font-mono text-slate-600 bg-slate-200/70 px-1.5 py-0.2 rounded text-[10px]">
                        MP-{(idx + 1).toString().padStart(2, '0')}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-sm font-sans uppercase tracking-tight truncate">
                      {member.full_name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-sans mt-0.5 truncate">
                      {member.notes || 'Anggota Komunitas MP'}
                    </div>
                  </div>

                  {/* CELL 2: FLIGHT LEVEL (FL) & BIRTH DATE */}
                  <div className="p-3.5 lg:w-40 flex-shrink-0 flex flex-col justify-between bg-white">
                    <div className="text-[10px] text-slate-400 font-bold">FL // BIRTH DATE</div>
                    <div className="text-base font-extrabold text-slate-900 tracking-wider">
                      {member.birth_date} {MONTH_SHORT[member.birth_month]}
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans">
                      {member.birth_year ? `Tahun: ${member.birth_year} (${age} Thn)` : 'Tahun: N/A'}
                    </div>
                  </div>

                  {/* CELL 3: ROUTE & TRANSPONDER (SQUAWK CODE / LINE ID) */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between bg-white">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1">
                      <span className="truncate pr-2">
                        DEST: <strong className="text-slate-700">{assignedGroupName.toUpperCase()}</strong>
                      </span>
                      <span>SQWK // LINE ID</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800 font-semibold tracking-tight">
                        {member.line_user_id || 'NO-SQUAWK // NONE'}
                      </span>
                      {hasLineId ? (
                        <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold border border-emerald-200 flex items-center space-x-0.5">
                          <Check className="w-2.5 h-2.5" />
                          <span>IDENT OK</span>
                        </span>
                      ) : (
                        <span className="text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold border border-amber-200 animate-pulse">
                          ALERT: NO ID
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans mt-1">
                      Mention Protocol: <span className="font-semibold text-slate-600">LINE textV2 (&le;20 Mention Batch)</span>
                    </div>
                  </div>

                  {/* CELL 4: CLEARANCE & STATUS GATE */}
                  <div className="p-3.5 lg:w-48 flex-shrink-0 flex flex-col justify-between bg-slate-50/60">
                    <div className="text-[10px] text-slate-400 font-bold">STATUS // CLEARANCE</div>
                    <div className="my-1">
                      {isToday ? (
                        <div className="inline-flex items-center space-x-1.5 bg-emerald-600 text-white font-bold text-[10px] px-2.5 py-1 rounded shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                          <span>HARI INI (07:00 WIB)</span>
                        </div>
                      ) : isUpcoming ? (
                        <div className="inline-flex items-center space-x-1 bg-cyan-100 text-cyan-800 font-bold text-[10px] px-2 py-0.5 rounded border border-cyan-200">
                          <Clock className="w-3 h-3 text-cyan-600" />
                          <span>D-{daysRemaining} MENDATANG</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded inline-block">
                          STANDBY
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px]">
                      <button
                        onClick={() => setSelectedStrip(member)}
                        className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center space-x-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>INSPECT</span>
                      </button>

                      <div className="flex items-center space-x-2">
                        {member.line_user_id && (
                          <button
                            onClick={() => copyToClipboard(member.line_user_id || '', member.id)}
                            className="text-slate-400 hover:text-slate-600 p-0.5"
                            title="Salin LINE ID"
                          >
                            {copiedId === member.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        {(currentRole === 'superadmin' || currentRole === 'logistik') && (
                          <button
                            onClick={() => handleDeleteMember(member.id)}
                            className="text-slate-400 hover:text-red-600 p-0.5"
                            title="Hapus Strip"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* VIEW MODE 2: CLASSIC TABLE VIEW */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3">Nama Anggota</th>
                  <th className="px-5 py-3">Tanggal Lahir</th>
                  <th className="px-5 py-3">Akun LINE (Mention)</th>
                  <th className="px-5 py-3">Penugasan Grup</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((member) => {
                  const assignedGroupName =
                    groups.find((g) => member.assigned_groups?.includes(g.id))?.group_name || 'Grup Inti MP';
                  const { isToday, isUpcoming, daysRemaining } = getMemberStatus(member);

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900">{member.full_name}</p>
                        {member.notes && <p className="text-[11px] text-slate-400">{member.notes}</p>}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-700">
                        {member.birth_date} {MONTH_NAMES[member.birth_month]}
                        {member.birth_year ? ` (${member.birth_year})` : ''}
                      </td>
                      <td className="px-5 py-3.5">
                        {member.line_user_id ? (
                          <div className="flex items-center space-x-1.5">
                            <span className="p-1 rounded-full bg-emerald-50 text-emerald-600">
                              <CheckCircle className="w-3 h-3" />
                            </span>
                            <span className="font-mono text-[11px] text-slate-800">
                              {member.line_user_id}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1.5 text-amber-600">
                            <AlertCircle className="w-3 h-3" />
                            <span className="text-[11px]">Belum Ada LINE ID</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                          {assignedGroupName}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {isToday ? (
                          <span className="bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                            HARI INI (07:00)
                          </span>
                        ) : isUpcoming ? (
                          <span className="bg-cyan-100 text-cyan-800 font-bold text-[10px] px-2 py-0.5 rounded-full border border-cyan-200">
                            D-{daysRemaining} MENDATANG
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-medium">
                            Aktif
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {(currentRole === 'superadmin' || currentRole === 'logistik') && (
                          <button
                            onClick={() => handleDeleteMember(member.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STRIP INSPECTOR DRAWER / MODAL (ATC FLIGHT PROGRESS STRIP DATA SHEET) */}
      {selectedStrip && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 animate-in fade-in zoom-in-95 duration-150 font-mono">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-emerald-400">
                <Radio className="w-4 h-4" />
                <h3 className="font-bold text-sm uppercase tracking-wider">
                  FLIGHT PROGRESS STRIP INSPECTOR // EFPS
                </h3>
              </div>
              <button
                onClick={() => setSelectedStrip(null)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                &times;
              </button>
            </div>

            {/* Strip Preview Card */}
            <div className="mt-4 p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px] pb-2 border-b border-slate-800">
                <span>CALLSIGN // MEMBER NAME:</span>
                <span className="font-bold text-emerald-400 text-sm">{selectedStrip.full_name}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-500 block">FL / BIRTH DATE:</span>
                  <span className="text-white font-bold text-xs">
                    {selectedStrip.birth_date} {MONTH_NAMES[selectedStrip.birth_month]}
                    {selectedStrip.birth_year ? ` (${selectedStrip.birth_year})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">DESTINATION GROUP:</span>
                  <span className="text-white font-bold text-xs">
                    {groups.find((g) => selectedStrip.assigned_groups?.includes(g.id))?.group_name || 'Grup Inti MP'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-500 block text-[11px] mb-1">TRANSPONDER SQUAWK // LINE USER ID:</span>
                <div className="bg-slate-900 p-2 rounded border border-slate-800 flex items-center justify-between">
                  <span className="text-emerald-300 font-bold">
                    {selectedStrip.line_user_id || 'NO TRANSPONDER (UNLINKED)'}
                  </span>
                  {selectedStrip.line_user_id && (
                    <button
                      onClick={() => copyToClipboard(selectedStrip.line_user_id || '', 'inspect')}
                      className="text-slate-400 hover:text-white text-[10px] flex items-center space-x-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>SALIN</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Exact textV2 Substitution Preview */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-500 block text-[11px] mb-1">LINE textV2 MENTION SYNTAX:</span>
                <pre className="bg-slate-900 p-2.5 rounded text-[10.5px] text-slate-300 overflow-x-auto leading-relaxed">
{`"substitution": {
  "user_mention": {
    "type": "mention",
    "mentionee": {
      "type": "user",
      "userId": "${selectedStrip.line_user_id || 'U_MISSING_ID'}"
    }
  }
}`}
                </pre>
              </div>
            </div>

            <div className="mt-4 flex justify-end space-x-2 text-xs">
              <button
                onClick={() => setSelectedStrip(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold"
              >
                Tutup Inspector
              </button>
              {(currentRole === 'superadmin' || currentRole === 'logistik') && (
                <Link
                  href="/dashboard/broadcast/manual?module=birthday"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center space-x-1.5"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>Kirim Mention Manual</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Plane className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Tambah Strip Anggota Baru (EFPS)</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddMember} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap (Callsign) *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Maria Natalia Kusumawati"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal *</label>
                  <select
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none font-mono"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bulan *</label>
                  <select
                    value={birthMonth}
                    onChange={(e) => setBirthMonth(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none"
                  >
                    {MONTH_NAMES.slice(1).map((m, i) => (
                      <option key={i + 1} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tahun (Opsional)</label>
                  <input
                    type="number"
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    placeholder="1998"
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Squawk // LINE User ID (Untuk LINE Mention Asli textV2)
                </label>
                <div className="relative">
                  <AtSign className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={lineUserId}
                    onChange={(e) => setLineUserId(e.target.value)}
                    placeholder="Contoh: U1234567890abcdef..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none font-mono text-xs"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Squawk ID digunakan sistem untuk LINE mention asli tanpa emotikon boneka.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Grup LINE Tujuan (Route Destination)</label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.group_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Peran / Catatan</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Tim Multimedia / Pelayan Liturgi"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                />
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
                  Simpan Strip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
