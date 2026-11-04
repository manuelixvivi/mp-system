'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import { useServerTime } from '@/context/ServerTimeContext';
import { Member, LineGroup } from '@/types';
import {
  Gift,
  Plus,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Trash2,
  Calendar,
  Users,
  AtSign,
  Radio,
  Layers,
  Plane,
  Clock,
  Eye,
  Check,
  Copy,
  CheckSquare,
  Square,
  GraduationCap,
  Sparkles,
  BookOpen,
  X,
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { parseMemberExcelBuffer } from '@/lib/excel/member-parser';

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

// Instagram SVG Icon Component
function InstagramIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export default function BirthdayManagementPage() {
  const { currentRole } = useRole();
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<LineGroup[]>([]);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  const [selectedEntryYear, setSelectedEntryYear] = useState<number | 'all'>('all');
  const [activeBay, setActiveBay] = useState<'all' | 'today' | 'upcoming' | 'alert'>('all');
  const [viewMode, setViewMode] = useState<'fps' | 'table'>('fps');
  const [loading, setLoading] = useState(true);

  // Multi-Selection State for bulk operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal inspection & Add states
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStrip, setSelectedStrip] = useState<Member | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Member Form States
  const [fullName, setFullName] = useState('');
  const [baptismalName, setBaptismalName] = useState('');
  const [birthDate, setBirthDate] = useState('1');
  const [birthMonth, setBirthMonth] = useState('1');
  const [birthYear, setBirthYear] = useState('');
  const [classOrigin, setClassOrigin] = useState('');
  const [entryYear, setEntryYear] = useState(new Date().getFullYear().toString());
  const [lineUserId, setLineUserId] = useState('');
  const [instagramAccount, setInstagramAccount] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Excel Upload States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadParsing, setUploadParsing] = useState(false);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);
  const [uploadParsedResult, setUploadParsedResult] = useState<{
    validMembers: any[];
    errors: { row: number; error: string; data: any }[];
    totalRows: number;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setUploadParsing(true);
    setUploadError(null);
    setUploadParsedResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const result = parseMemberExcelBuffer(buffer);
      setUploadParsedResult(result);
    } catch (err: any) {
      setUploadError(err.message || 'Gagal membaca file Excel. Pastikan format file .xlsx valid.');
    } finally {
      setUploadParsing(false);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadParsedResult || uploadParsedResult.validMembers.length === 0) return;
    setUploadSubmitting(true);
    setUploadError(null);

    try {
      const res = await fetch('/api/members/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members: uploadParsedResult.validMembers }),
      });
      const data = await res.json();

      if (data.success) {
        showNotification(data.message || `Berhasil mengimpor ${data.count} anggota!`, 'success');
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadParsedResult(null);
        await loadData();
      } else {
        setUploadError(data.error || 'Gagal mengimpor anggota');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Terjadi kesalahan sistem saat mengimpor.');
    } finally {
      setUploadSubmitting(false);
    }
  };

  const loadData = async () => {
    try {
      const [memRes, grpRes] = await Promise.all([
        fetch('/api/members').then((r) => r.json()),
        fetch('/api/groups').then((r) => r.json()),
      ]);
      setMembers(memRes.members || []);
      setGroups(grpRes.groups || []);
      if (grpRes.groups?.length > 0 && !selectedGroup) {
        setSelectedGroup(grpRes.groups[0].id);
      }
    } catch (e) {
      console.error('Failed loading member/group data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !birthDate || !birthMonth) {
      alert('Nama lengkap, tanggal lahir, dan bulan lahir wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          baptismal_name: baptismalName,
          birth_date: Number(birthDate),
          birth_month: Number(birthMonth),
          birth_year: birthYear ? Number(birthYear) : undefined,
          class_origin: classOrigin,
          entry_year: entryYear ? Number(entryYear) : undefined,
          line_user_id: lineUserId,
          instagram_account: instagramAccount,
          assigned_groups: selectedGroup ? [selectedGroup] : [],
          notes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowAddModal(false);
        // Reset form
        setFullName('');
        setBaptismalName('');
        setClassOrigin('');
        setEntryYear(new Date().getFullYear().toString());
        setLineUserId('');
        setInstagramAccount('');
        setNotes('');
        setBirthYear('');
        showNotification('Data anggota ulang tahun berhasil ditambahkan!');
        loadData();
      } else {
        alert(data.error || 'Gagal menambahkan anggota.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper calculations for Flight Progress Strips (Synchronized to Server WIB Time)
  const { wibDay: todayDate, wibMonth: todayMonth, wibYear: currentYear } = useServerTime();

  const getMemberStatus = (member: Member) => {
    const isToday = member.birth_date === todayDate && member.birth_month === todayMonth;
    const hasLineId = Boolean(member.line_user_id && member.line_user_id.trim().length > 0);

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

  // Dynamically extract available entry years from loaded members
  const availableEntryYears = Array.from(
    new Set(
      members
        .map((m) => m.entry_year)
        .filter((y): y is number => typeof y === 'number' && !isNaN(y) && y > 1990)
    )
  ).sort((a, b) => b - a);

  // Filter members based on search, month, entry year, and bay tabs
  const filteredMembers = members.filter((m) => {
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      m.full_name.toLowerCase().includes(q) ||
      (m.baptismal_name || '').toLowerCase().includes(q) ||
      (m.class_origin || '').toLowerCase().includes(q) ||
      (m.instagram_account || '').toLowerCase().includes(q) ||
      (m.line_user_id || '').toLowerCase().includes(q);

    const matchMonth = selectedMonth === 0 || m.birth_month === selectedMonth;
    const matchEntryYear = selectedEntryYear === 'all' || m.entry_year === selectedEntryYear;

    const { isToday, isUpcoming, hasLineId } = getMemberStatus(m);
    let matchBay = true;
    if (activeBay === 'today') matchBay = isToday;
    else if (activeBay === 'upcoming') matchBay = isUpcoming;
    else if (activeBay === 'alert') matchBay = !hasLineId;

    return matchSearch && matchMonth && matchBay && matchEntryYear;
  });

  // Multi-selection Handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const currentFilteredIds = filteredMembers.map((m) => m.id);
    const areAllFilteredSelected =
      currentFilteredIds.length > 0 &&
      currentFilteredIds.every((id) => selectedIds.includes(id));

    if (areAllFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentFilteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentFilteredIds])));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Trigger deletion for selected members (enforces "harus diselect dulu")
  const handleOpenDeleteConfirm = () => {
    if (selectedIds.length === 0) {
      alert('Pilih terlebih dahulu anggota yang ingin dihapus dengan mencentang kotak seleksi.');
      return;
    }
    setShowDeleteModal(true);
  };

  const handleQuickSelectAndDelete = (id: string) => {
    setSelectedIds([id]);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);

    try {
      const res = await fetch('/api/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const data = await res.json();
      if (res.ok) {
        showNotification(data.message || `${selectedIds.length} data anggota berhasil dihapus.`);
        setSelectedIds([]);
        setShowDeleteModal(false);
        if (selectedStrip && selectedIds.includes(selectedStrip.id)) {
          setSelectedStrip(null);
        }
        loadData();
      } else {
        alert(data.error || 'Gagal menghapus data.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi saat menghapus.');
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Bay counts
  const countToday = members.filter((m) => getMemberStatus(m).isToday).length;
  const countUpcoming = members.filter((m) => getMemberStatus(m).isUpcoming).length;
  const countAlert = members.filter((m) => !getMemberStatus(m).hasLineId).length;

  const isAllFilteredSelected =
    filteredMembers.length > 0 &&
    filteredMembers.every((m) => selectedIds.includes(m.id));

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Toast Notification */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-md animate-in slide-in-from-top-2 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-red-50 text-red-800 border-red-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-700">
            &times;
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full font-medium inline-flex mb-2">
            <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            <span>Birthday Progress Board • Electronic Flight Progress Strip (EFPS)</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Daftar Ulang Tahun Anggota
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola data anggota (tanggal lahir, nama lengkap, nama baptis, asal kelas, tahun masuk, akun LINE, dan akun Instagram) dengan sistem seleksi & filter terintegrasi.
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
            <>
              <button
                onClick={() => {
                  setUploadFile(null);
                  setUploadParsedResult(null);
                  setUploadError(null);
                  setShowUploadModal(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-700" />
                <span>Upload Excel (.xlsx)</span>
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Anggota</span>
              </button>
            </>
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

      {/* Filter and Search Bar with ENTRY YEAR and BULK ACTIONS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search box */}
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari Nama, Baptis, Kelas, LINE, IG..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>

          {/* Filter Bulan */}
          <div className="flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none font-medium bg-white text-slate-700"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={idx} value={idx}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Tahun Masuk (Entry Year) */}
          <div className="flex items-center space-x-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
            <select
              value={selectedEntryYear}
              onChange={(e) =>
                setSelectedEntryYear(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="text-xs border border-blue-200 bg-blue-50/50 rounded-lg px-2.5 py-2 focus:outline-none font-semibold text-blue-900"
            >
              <option value="all">Semua Tahun Masuk</option>
              {availableEntryYears.map((yr) => (
                <option key={yr} value={yr}>
                  Tahun Masuk {yr}
                </option>
              ))}
              {/* Fallback presets if data is sparse */}
              {!availableEntryYears.includes(2026) && <option value="2026">Tahun Masuk 2026</option>}
              {!availableEntryYears.includes(2025) && <option value="2025">Tahun Masuk 2025</option>}
              {!availableEntryYears.includes(2024) && <option value="2024">Tahun Masuk 2024</option>}
              {!availableEntryYears.includes(2023) && <option value="2023">Tahun Masuk 2023</option>}
              {!availableEntryYears.includes(2022) && <option value="2022">Tahun Masuk 2022</option>}
            </select>
          </div>
        </div>

        {/* Master Select & Status Counter */}
        <div className="flex items-center space-x-3 text-xs font-mono justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0">
          <button
            onClick={handleSelectAll}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold transition-all text-xs"
          >
            {isAllFilteredSelected ? (
              <CheckSquare className="w-4 h-4 text-emerald-600" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>{isAllFilteredSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}</span>
          </button>

          <span className="text-slate-500 font-mono text-[11px]">
            {filteredMembers.length} DITAMPILKAN
          </span>
        </div>
      </div>

      {/* FLOATING BULK SELECTION ACTION BAR (Always visible when items selected) */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-3">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-extrabold flex items-center justify-center text-xs">
              {selectedIds.length}
            </span>
            <div>
              <p className="text-xs font-bold font-mono">
                {selectedIds.length} Strip Anggota Terpilih
              </p>
              <p className="text-[11px] text-slate-400">
                Pilih aksi massal untuk anggota yang telah dicentang.
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

            {(currentRole === 'superadmin' || currentRole === 'logistik') && (
              <button
                onClick={handleOpenDeleteConfirm}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus {selectedIds.length} Anggota Terpilih</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE 1: FLIGHT PROGRESS STRIPS (EFPS ATC RACK VIEW) */}
      {viewMode === 'fps' ? (
        <div className="space-y-3">
          {filteredMembers.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-sm font-mono text-xs text-slate-400">
              TIDAK ADA DATA ANGGOTA SESUAI DENGAN FILTER TAHUN MASUK ATAU PENCARIAN.
            </div>
          ) : (
            filteredMembers.map((member, idx) => {
              const { isToday, isUpcoming, daysRemaining, hasLineId, age } = getMemberStatus(member);
              const assignedGroupName =
                groups.find((g) => member.assigned_groups?.includes(g.id))?.group_name || 'Grup Inti MP';
              const isSelected = selectedIds.includes(member.id);

              // Strip accent colors
              let borderAccent = 'border-l-slate-400';
              let stripBg = isSelected ? 'bg-blue-50/40 ring-2 ring-blue-400' : 'bg-white';

              if (isToday) {
                borderAccent = 'border-l-emerald-500';
                stripBg = isSelected ? 'bg-emerald-50/50 ring-2 ring-emerald-500' : 'bg-emerald-50/20';
              } else if (!hasLineId) {
                borderAccent = 'border-l-amber-500';
                stripBg = isSelected ? 'bg-amber-50/50 ring-2 ring-amber-500' : 'bg-amber-50/20';
              } else if (isUpcoming) {
                borderAccent = 'border-l-cyan-500';
                stripBg = isSelected ? 'bg-cyan-50/50 ring-2 ring-cyan-500' : 'bg-cyan-50/20';
              }

              return (
                <div
                  key={member.id}
                  className={`${stripBg} border border-slate-300/80 rounded-xl shadow-sm hover:shadow-md transition-all font-mono text-xs overflow-hidden border-l-[8px] ${borderAccent} flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-200/80 hover:border-slate-400 group`}
                >
                  {/* CELL 0: CHECKBOX FOR SELECTION */}
                  <div className="p-3 lg:w-12 flex-shrink-0 flex items-center justify-center bg-slate-50/80">
                    <button
                      type="button"
                      onClick={() => handleToggleSelect(member.id)}
                      className="p-1 text-slate-500 hover:text-emerald-600 transition-colors"
                      title={isSelected ? 'Batalkan pilihan' : 'Pilih anggota untuk dihapus / dikelola'}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-emerald-600 fill-emerald-50" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300 hover:text-slate-500" />
                      )}
                    </button>
                  </div>

                  {/* CELL 1: CALLSIGN / IDENTITY + BAPTISMAL NAME + CLASS + ENTRY YEAR */}
                  <div className="p-3.5 lg:w-72 flex-shrink-0 flex flex-col justify-between bg-slate-50/40 font-sans">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono font-bold mb-1">
                      <span>CALLSIGN // ID</span>
                      <span className="text-slate-600 bg-slate-200/70 px-1.5 py-0.2 rounded text-[10px]">
                        MP-{(idx + 1).toString().padStart(2, '0')}
                      </span>
                    </div>

                    <div>
                      {/* Nama Baptis Badge */}
                      {member.baptismal_name && (
                        <div className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md mb-1 border border-emerald-200">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          <span>{member.baptismal_name}</span>
                        </div>
                      )}

                      {/* Nama Lengkap */}
                      <div className="font-bold text-slate-900 text-sm tracking-tight truncate">
                        {member.full_name}
                      </div>
                    </div>

                    {/* Asal Kelas & Tahun Masuk */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2 font-mono text-[10px]">
                      {member.class_origin && (
                        <span className="bg-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded font-semibold">
                          Kelas: {member.class_origin}
                        </span>
                      )}
                      {member.entry_year && (
                        <span className="bg-blue-100/80 text-blue-800 px-1.5 py-0.5 rounded font-semibold border border-blue-200">
                          Masuk: {member.entry_year}
                        </span>
                      )}
                      {member.notes && (
                        <span className="text-slate-500 text-[10px] truncate max-w-[140px]" title={member.notes}>
                          • {member.notes}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CELL 2: FLIGHT LEVEL (FL) & BIRTH DATE */}
                  <div className="p-3.5 lg:w-44 flex-shrink-0 flex flex-col justify-between bg-white font-mono">
                    <div className="text-[10px] text-slate-400 font-bold">FL // BIRTH DATE</div>
                    <div className="text-base font-extrabold text-slate-900 tracking-wider">
                      {member.birth_date} {MONTH_SHORT[member.birth_month]}
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans">
                      {member.birth_year ? `Tahun: ${member.birth_year} (${age} Thn)` : 'Tahun Lahir: N/A'}
                    </div>
                  </div>

                  {/* CELL 3: TRANSPONDER (LINE & INSTAGRAM ACCOUNTS) */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between bg-white font-mono">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1 font-sans">
                      <span className="truncate pr-2 font-mono">
                        DEST: <strong className="text-slate-700">{assignedGroupName.toUpperCase()}</strong>
                      </span>
                      <span>SQUAWK & SOSIAL</span>
                    </div>

                    {/* Akun LINE & Instagram */}
                    <div className="space-y-1.5">
                      {/* Akun LINE */}
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[10.5px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800 font-semibold tracking-tight truncate max-w-[200px]">
                          LINE: {member.line_user_id || 'NO-SQUAWK'}
                        </span>
                        {hasLineId ? (
                          <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold border border-emerald-200 flex items-center space-x-0.5">
                            <Check className="w-2.5 h-2.5" />
                            <span>OK</span>
                          </span>
                        ) : (
                          <span className="text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold border border-amber-200">
                            BELUM ADA LINE
                          </span>
                        )}
                      </div>

                      {/* Akun Instagram */}
                      <div className="flex items-center space-x-1.5 text-pink-700 font-sans text-xs">
                        <div className="p-1 rounded bg-pink-50 border border-pink-200 text-pink-600 flex items-center justify-center">
                          <InstagramIcon className="w-3 h-3" />
                        </div>
                        <span className="font-semibold text-[11px] truncate">
                          {member.instagram_account || (
                            <span className="text-slate-400 font-normal">Tidak ada Instagram</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 font-sans mt-1">
                      Protokol: <span className="font-semibold text-slate-600">LINE textV2 Mention & Instagram Greetings</span>
                    </div>
                  </div>

                  {/* CELL 4: CLEARANCE & STATUS & INDIVIDUAL SELECTION ACTION */}
                  <div className="p-3.5 lg:w-48 flex-shrink-0 flex flex-col justify-between bg-slate-50/60 font-mono">
                    <div className="text-[10px] text-slate-400 font-bold">STATUS // CLEARANCE</div>
                    <div className="my-1">
                      {isToday ? (
                        <div className="inline-flex items-center space-x-1.5 bg-emerald-600 text-white font-bold text-[10px] px-2.5 py-1 rounded shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                          <span>HARI INI (07:00)</span>
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
                        <span>DETAIL</span>
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
                            onClick={() => handleQuickSelectAndDelete(member.id)}
                            className="text-slate-400 hover:text-red-600 p-0.5 transition-colors"
                            title="Pilih dan Hapus Anggota Ini"
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
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3 w-10 text-center">
                    <button onClick={handleSelectAll} title="Pilih Semua">
                      {isAllFilteredSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3">Nama Lengkap & Nama Baptis</th>
                  <th className="px-4 py-3">Tanggal Lahir</th>
                  <th className="px-4 py-3">Kelas & Tahun Masuk</th>
                  <th className="px-4 py-3">Akun LINE</th>
                  <th className="px-4 py-3">Akun Instagram</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((member) => {
                  const { isToday, isUpcoming, daysRemaining } = getMemberStatus(member);
                  const isSelected = selectedIds.includes(member.id);

                  return (
                    <tr
                      key={member.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(member.id)}
                          className="text-slate-400 hover:text-emerald-600"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{member.full_name}</div>
                        {member.baptismal_name && (
                          <div className="text-[11px] text-emerald-700 font-medium flex items-center space-x-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>{member.baptismal_name}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-700 font-mono">
                        {member.birth_date} {MONTH_NAMES[member.birth_month]}
                        {member.birth_year ? ` (${member.birth_year})` : ''}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800">
                          {member.class_origin || '-'}
                        </div>
                        <div className="text-[11px] text-blue-600 font-medium">
                          Masuk: {member.entry_year || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {member.line_user_id ? (
                          <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                            {member.line_user_id}
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-600 font-medium">Belum ada</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {member.instagram_account ? (
                          <div className="flex items-center space-x-1.5 text-pink-700 font-medium">
                            <InstagramIcon className="w-3.5 h-3.5 text-pink-500" />
                            <span>{member.instagram_account}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {isToday ? (
                          <span className="bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                            HARI INI
                          </span>
                        ) : isUpcoming ? (
                          <span className="bg-cyan-100 text-cyan-800 font-bold text-[10px] px-2 py-0.5 rounded-full border border-cyan-200">
                            D-{daysRemaining}
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-medium">
                            Standby
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setSelectedStrip(member)}
                            className="p-1 text-slate-400 hover:text-emerald-600 rounded"
                            title="Lihat Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {(currentRole === 'superadmin' || currentRole === 'logistik') && (
                            <button
                              onClick={() => handleQuickSelectAndDelete(member.id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded"
                              title="Pilih & Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFIRM BULK / INDIVIDUAL DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 font-sans">
            <div className="flex items-center space-x-3 text-red-600 pb-3 border-b border-slate-100">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Konfirmasi Hapus Data Anggota</h3>
                <p className="text-xs text-slate-500">
                  {selectedIds.length} data anggota ulang tahun terpilih
                </p>
              </div>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus <strong>{selectedIds.length} data anggota</strong> yang dipilih? Data yang telah dihapus akan dihilangkan dari database dan jadwal siaran otomatis ulang tahun.
              </p>

              {/* Preview of members to be deleted */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-36 overflow-y-auto space-y-1.5 text-xs">
                {members
                  .filter((m) => selectedIds.includes(m.id))
                  .map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-slate-700">
                      <span className="font-medium truncate max-w-[200px]">
                        {m.full_name} {m.baptismal_name ? `(${m.baptismal_name})` : ''}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {m.birth_date} {MONTH_SHORT[m.birth_month]}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

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
                    <span>Ya, Hapus {selectedIds.length} Anggota</span>
                  </>
                )}
              </button>
            </div>
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
            <div className="mt-4 p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3.5 text-xs">
              {/* Nama Lengkap & Nama Baptis */}
              <div className="flex flex-col space-y-1 pb-3 border-b border-slate-800">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>NAMA LENGKAP:</span>
                  <span className="font-bold text-emerald-400 text-sm">{selectedStrip.full_name}</span>
                </div>
                {selectedStrip.baptismal_name && (
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>NAMA BAPTIS:</span>
                    <span className="text-white font-semibold">{selectedStrip.baptismal_name}</span>
                  </div>
                )}
              </div>

              {/* Tanggal Lahir & Usia */}
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-500 block">TANGGAL LAHIR (FL):</span>
                  <span className="text-white font-bold text-xs">
                    {selectedStrip.birth_date} {MONTH_NAMES[selectedStrip.birth_month]}
                    {selectedStrip.birth_year ? ` (${selectedStrip.birth_year})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">ASAL KELAS & MASUK:</span>
                  <span className="text-white font-bold text-xs">
                    {selectedStrip.class_origin || '-'} • Thn {selectedStrip.entry_year || '-'}
                  </span>
                </div>
              </div>

              {/* Akun LINE */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-500 block text-[11px] mb-1">
                  AKUN LINE (SQUAWK // LINE USER ID):
                </span>
                <div className="bg-slate-900 p-2 rounded border border-slate-800 flex items-center justify-between">
                  <span className="text-emerald-300 font-bold">
                    {selectedStrip.line_user_id || 'NO TRANSPONDER (BELUM ADA LINE)'}
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

              {/* Akun Instagram */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-500 block text-[11px] mb-1">AKUN INSTAGRAM:</span>
                <div className="bg-slate-900 p-2 rounded border border-slate-800 flex items-center justify-between">
                  <span className="text-pink-400 font-bold flex items-center space-x-1.5 font-sans">
                    <InstagramIcon className="w-3.5 h-3.5" />
                    <span>{selectedStrip.instagram_account || 'Belum diisi'}</span>
                  </span>
                  {selectedStrip.instagram_account && (
                    <button
                      onClick={() => copyToClipboard(selectedStrip.instagram_account || '', 'inspect_ig')}
                      className="text-slate-400 hover:text-white text-[10px] flex items-center space-x-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>SALIN</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Catatan / Penugasan Grup */}
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                <span>DESTINASI GRUP: </span>
                <strong className="text-slate-200">
                  {groups.find((g) => selectedStrip.assigned_groups?.includes(g.id))?.group_name || 'Grup Inti MP'}
                </strong>
                {selectedStrip.notes && (
                  <p className="mt-1 text-slate-400 italic">Catatan: {selectedStrip.notes}</p>
                )}
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center text-xs">
              {(currentRole === 'superadmin' || currentRole === 'logistik') && (
                <button
                  onClick={() => {
                    handleQuickSelectAndDelete(selectedStrip.id);
                  }}
                  className="px-3 py-2 bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800 rounded-lg font-bold flex items-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Anggota Ini</span>
                </button>
              )}

              <button
                onClick={() => setSelectedStrip(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold ml-auto"
              >
                Tutup Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MEMBER MODAL WITH ALL REQUIRED FIELDS */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Plane className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Tambah Data Anggota Ulang Tahun</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddMember} className="mt-4 space-y-3 text-xs">
              {/* Nama Lengkap & Nama Baptis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Kevin Pratama"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Baptis (Opsional)
                  </label>
                  <input
                    type="text"
                    value={baptismalName}
                    onChange={(e) => setBaptismalName(e.target.value)}
                    placeholder="Contoh: Alexander"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Tanggal Lahir (D, M, Y) */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Lahir *</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">Bulan Lahir *</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">Tahun Lahir</label>
                  <input
                    type="number"
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    placeholder="Contoh: 1998"
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Asal Kelas & Tahun Masuk */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Asal Kelas *
                  </label>
                  <input
                    type="text"
                    required
                    value={classOrigin}
                    onChange={(e) => setClassOrigin(e.target.value)}
                    placeholder="Contoh: XII MIPA 1, XI-B, X-3"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tahun Masuk (Angkatan) *
                  </label>
                  <input
                    type="number"
                    required
                    value={entryYear}
                    onChange={(e) => setEntryYear(e.target.value)}
                    placeholder="Contoh: 2024"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Akun LINE & Akun Instagram */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Akun LINE (LINE User ID / ID Akun)
                  </label>
                  <div className="relative">
                    <AtSign className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={lineUserId}
                      onChange={(e) => setLineUserId(e.target.value)}
                      placeholder="Contoh: U123456789... / line_id"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Akun Instagram (@username)
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-2.5 text-slate-400">
                      <InstagramIcon className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={instagramAccount}
                      onChange={(e) => setInstagramAccount(e.target.value)}
                      placeholder="Contoh: @kevin_pratama"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Grup LINE Tujuan & Catatan */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Grup LINE Tujuan (Route Destination)
                </label>
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
                  placeholder="Contoh: Sie Acara / Anggota Aktif"
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
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Data Anggota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXCEL UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Import Data Anggota Ulang Tahun (.xlsx)</h3>
                  <p className="text-[11px] text-slate-500">Upload spreadsheet Excel untuk menambahkan data anggota secara massal.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                  setUploadParsedResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {/* Template Banner */}
            <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-bold text-amber-900">Belum punya format Excel?</p>
                <p className="text-amber-700 text-[11px] mt-0.5">
                  Unduh template resmi dengan format kolom tanggal lahir yang sudah disesuaikan.
                </p>
              </div>
              <a
                href="/api/members/template"
                download="template_anggota_ulang_tahun.xlsx"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shrink-0 shadow-sm transition-all text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Template (.xlsx)</span>
              </a>
            </div>

            {/* File Upload Dropzone */}
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors bg-slate-50/50">
              <input
                type="file"
                id="excelFileInput"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="excelFileInput" className="cursor-pointer block space-y-2">
                <div className="p-3 bg-white rounded-full border border-slate-200 w-fit mx-auto text-emerald-600 shadow-sm">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-semibold text-emerald-600 text-xs hover:underline">
                    {uploadFile ? uploadFile.name : 'Pilih file Excel (.xlsx / .xls)'}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">atau drag and drop file ke sini</p>
                </div>
              </label>
            </div>

            {/* Parsing Spinner */}
            {uploadParsing && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-600 flex items-center justify-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                <span>Membaca dan memvalidasi baris spreadsheet...</span>
              </div>
            )}

            {/* Upload Error */}
            {uploadError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Preview Section */}
            {uploadParsedResult && (
              <div className="space-y-3 pt-2 text-xs">
                {/* Stats row */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-semibold text-[11px]">
                    Total: {uploadParsedResult.totalRows} baris
                  </span>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-semibold text-[11px]">
                    ✓ Siap Diimpor: {uploadParsedResult.validMembers.length}
                  </span>
                  {uploadParsedResult.errors.length > 0 && (
                    <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg font-semibold text-[11px]">
                      ✕ Dilewati: {uploadParsedResult.errors.length}
                    </span>
                  )}
                </div>

                {/* Errors notification if any */}
                {uploadParsedResult.errors.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] max-h-28 overflow-y-auto space-y-1">
                    <p className="font-bold text-amber-950">Catatan Validasi Baris:</p>
                    {uploadParsedResult.errors.map((e, idx) => (
                      <p key={idx}>
                        • Baris {e.row}: <span className="font-medium text-rose-700">{e.error}</span>
                      </p>
                    ))}
                  </div>
                )}

                {/* Table Preview */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                        <tr>
                          <th className="p-2">Nama Lengkap</th>
                          <th className="p-2">Tgl Lahir</th>
                          <th className="p-2">Kelas</th>
                          <th className="p-2">LINE ID</th>
                          <th className="p-2">Instagram</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {uploadParsedResult.validMembers.slice(0, 10).map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-medium text-slate-900">
                              {m.full_name}
                              {m.baptismal_name && (
                                <span className="text-[10px] text-slate-400 block font-normal">{m.baptismal_name}</span>
                              )}
                            </td>
                            <td className="p-2 text-slate-700">
                              {m.birth_date}/{m.birth_month}
                              {m.birth_year ? `/${m.birth_year}` : ''}
                            </td>
                            <td className="p-2 text-slate-500">{m.class_origin || '-'}</td>
                            <td className="p-2 text-slate-500 font-mono text-[10px]">{m.line_user_id || '-'}</td>
                            <td className="p-2 text-slate-500">{m.instagram_account || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {uploadParsedResult.validMembers.length > 10 && (
                    <div className="p-2 bg-slate-50 text-center text-[10px] text-slate-500 border-t border-slate-200">
                      Menampilkan 10 dari {uploadParsedResult.validMembers.length} anggota yang akan disimpan.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                  setUploadParsedResult(null);
                }}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleUploadSubmit}
                disabled={uploadSubmitting || !uploadParsedResult || uploadParsedResult.validMembers.length === 0}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 shadow-sm disabled:opacity-50 flex items-center space-x-1.5"
              >
                {uploadSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan ke Database...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {uploadParsedResult
                        ? `Simpan ${uploadParsedResult.validMembers.length} Anggota`
                        : 'Simpan Anggota'}
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
