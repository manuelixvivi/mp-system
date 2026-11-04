'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import { useServerTime } from '@/context/ServerTimeContext';
import { Member, LineGroup, MemberCommunityRole } from '@/types';
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

const COMMUNITY_ROLES: { id: MemberCommunityRole; label: string; badge: string }[] = [
  { id: 'anggota_aktif', label: 'Anggota Aktif', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  { id: 'ketua', label: 'Ketua', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'wakil_ketua', label: 'Wakil Ketua', badge: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'bendahara', label: 'Bendahara', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'sekretaris', label: 'Sekretaris', badge: 'bg-purple-100 text-purple-800 border-purple-300' },
  { id: 'liturgi_humas', label: 'Liturgi & Humas', badge: 'bg-orange-100 text-orange-800 border-orange-300' },
  { id: 'logistik', label: 'Logistik', badge: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { id: 'pubdok', label: 'Pubdok', badge: 'bg-rose-100 text-rose-800 border-rose-300' },
  { id: 'acara', label: 'Acara', badge: 'bg-teal-100 text-teal-800 border-teal-300' },
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
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [activeBay, setActiveBay] = useState<'all' | 'today' | 'upcoming' | 'alert'>('all');
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
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [communityRole, setCommunityRole] = useState<MemberCommunityRole>('anggota_aktif');
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

  const handleUpdateMemberRole = async (memberId: string, newRole: MemberCommunityRole) => {
    try {
      const res = await fetch('/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: memberId, community_role: newRole }),
      });
      if (res.ok) {
        showNotification('Jabatan/role anggota berhasil diperbarui!');
        loadData();
      } else {
        const err = await res.json();
        showNotification(err.error || 'Gagal mengubah jabatan', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
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
          line_id: lineUserId,
          instagram_account: instagramAccount,
          whatsapp_number: whatsappNumber,
          community_role: communityRole,
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
        setWhatsappNumber('');
        setCommunityRole('anggota_aktif');
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
      (m.line_user_id || '').toLowerCase().includes(q) ||
      (m.line_id || '').toLowerCase().includes(q) ||
      (m.community_role || '').toLowerCase().includes(q);

    const matchMonth = selectedMonth === 0 || m.birth_month === selectedMonth;
    const matchEntryYear = selectedEntryYear === 'all' || m.entry_year === selectedEntryYear;
    const matchGroup =
      selectedGroupFilter === 'all' ||
      !m.assigned_groups ||
      m.assigned_groups.length === 0 ||
      m.assigned_groups.includes(selectedGroupFilter);

    const { isToday, isUpcoming, hasLineId } = getMemberStatus(m);
    let matchBay = true;
    if (activeBay === 'today') matchBay = isToday;
    else if (activeBay === 'upcoming') matchBay = isUpcoming;
    else if (activeBay === 'alert') matchBay = !hasLineId;

    return matchSearch && matchMonth && matchBay && matchEntryYear && matchGroup;
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
          <div className="flex items-center space-x-2 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-medium inline-flex mb-2">
            <Gift className="w-3.5 h-3.5 text-emerald-600" />
            <span>Manajemen Ulang Tahun Anggota • Database Komunitas</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Daftar Ulang Tahun Anggota
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Data anggota aktif, tanggal lahir, nama baptis, asal kelas, angkatan, akun LINE, dan WhatsApp terintegrasi penuh ke database.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
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

      {/* Community Status Tabs */}
      <div className="bg-white rounded-xl p-2 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveBay('all')}
            className={`px-3.5 py-1.5 rounded-lg border font-medium transition-all ${
              activeBay === 'all'
                ? 'bg-slate-900 border-slate-900 text-white font-semibold shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Semua Anggota ({members.length})
          </button>
          <button
            onClick={() => setActiveBay('today')}
            className={`px-3.5 py-1.5 rounded-lg border font-medium transition-all flex items-center space-x-1.5 ${
              activeBay === 'today'
                ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-sm'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
            <span>🎉 Ulang Tahun Hari Ini ({countToday})</span>
          </button>
          <button
            onClick={() => setActiveBay('upcoming')}
            className={`px-3.5 py-1.5 rounded-lg border font-medium transition-all flex items-center space-x-1.5 ${
              activeBay === 'upcoming'
                ? 'bg-cyan-600 border-cyan-600 text-white font-bold shadow-sm'
                : 'bg-cyan-50 border-cyan-200 text-cyan-800 hover:bg-cyan-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
            <span>Mendatang 7 Hari ({countUpcoming})</span>
          </button>
          <button
            onClick={() => setActiveBay('alert')}
            className={`px-3.5 py-1.5 rounded-lg border font-medium transition-all flex items-center space-x-1.5 ${
              activeBay === 'alert'
                ? 'bg-amber-600 border-amber-600 text-white font-bold shadow-sm'
                : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
            <span>Belum Punya LINE ID ({countAlert})</span>
          </button>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors ml-auto"
          title="Segarkan data dari database"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar with ENTRY YEAR, GROUP, and BULK ACTIONS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search box */}
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari Nama, Baptis, Kelas, LINE, IG, Role..."
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
              {!availableEntryYears.includes(2026) && <option value="2026">Tahun Masuk 2026</option>}
              {!availableEntryYears.includes(2025) && <option value="2025">Tahun Masuk 2025</option>}
              {!availableEntryYears.includes(2024) && <option value="2024">Tahun Masuk 2024</option>}
              {!availableEntryYears.includes(2023) && <option value="2023">Tahun Masuk 2023</option>}
            </select>
          </div>

          {/* Filter Grup LINE */}
          {groups.length > 0 && (
            <div className="flex items-center space-x-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedGroupFilter}
                onChange={(e) => setSelectedGroupFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none font-medium bg-white text-slate-700"
              >
                <option value="all">Semua Grup LINE</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.group_name}
                  </option>
                ))}
              </select>
            </div>
          )}
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

            {/* CLASSIC COMMUNITY TABLE VIEW */}
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
                <th className="px-4 py-3">Anggota</th>
                <th className="px-4 py-3">Jabatan / Role</th>
                <th className="px-4 py-3">Tanggal Lahir</th>
                <th className="px-4 py-3">Status Ultah</th>
                <th className="px-4 py-3">Kelas & Angkatan</th>
                <th className="px-4 py-3">Akun LINE</th>
                <th className="px-4 py-3">Instagram & WhatsApp</th>
                <th className="px-4 py-3">Grup LINE</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    Tidak ada data anggota yang sesuai dengan filter atau pencarian Anda.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const { isToday, isUpcoming, daysRemaining, hasLineId, age } = getMemberStatus(member);
                  const isSelected = selectedIds.includes(member.id);
                  const memberRole = member.community_role || 'anggota_aktif';
                  const roleInfo = COMMUNITY_ROLES.find((r) => r.id === memberRole) || COMMUNITY_ROLES[0];
                  const assignedGroupObj = groups.find((g) => member.assigned_groups?.includes(g.id) || member.assigned_groups?.includes(g.group_id));

                  return (
                    <tr
                      key={member.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-blue-50/40' : isToday ? 'bg-emerald-50/30' : ''
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
                        <div className="flex items-center space-x-3">
                          {member.photo_url ? (
                            <img
                              src={member.photo_url}
                              alt={member.full_name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                              {member.full_name
                                .split(' ')
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 text-xs flex items-center space-x-1">
                              <span>{member.full_name}</span>
                            </div>
                            {member.baptismal_name && (
                              <div className="text-[11px] text-emerald-700 font-medium flex items-center space-x-1 mt-0.5">
                                <Sparkles className="w-2.5 h-2.5 text-emerald-500" />
                                <span>{member.baptismal_name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {currentRole === 'superadmin' ? (
                          <select
                            value={memberRole}
                            onChange={(e) =>
                              handleUpdateMemberRole(member.id, e.target.value as MemberCommunityRole)
                            }
                            className={`text-[10px] font-semibold px-2 py-1 rounded-md border cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 ${roleInfo.badge}`}
                            title="Ubah Jabatan/Role Anggota"
                          >
                            {COMMUNITY_ROLES.map((r) => (
                              <option key={r.id} value={r.id} className="bg-white text-slate-800">
                                {r.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleInfo.badge}`}>
                            {roleInfo.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-700">
                        <div className="font-semibold">
                          {member.birth_date} {MONTH_NAMES[member.birth_month]}
                        </div>
                        {member.birth_year ? (
                          <div className="text-[10px] text-slate-400">
                            {member.birth_year} {age ? `• ${age} Thn` : ''}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5">
                        {isToday ? (
                          <span className="bg-emerald-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-full shadow-sm animate-pulse inline-flex items-center space-x-1">
                            <span>🎉 HARI INI</span>
                          </span>
                        ) : isUpcoming ? (
                          <span className="bg-cyan-100 text-cyan-800 font-bold text-[10px] px-2 py-0.5 rounded-full border border-cyan-200">
                            D-{daysRemaining}
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-medium">
                            Standby
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800">
                          {member.class_origin || '-'}
                        </div>
                        <div className="text-[10px] text-blue-600 font-medium">
                          {member.entry_year ? `Angkatan ${member.entry_year}` : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {member.line_user_id || member.line_id ? (
                          <div className="flex items-center space-x-1">
                            <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                              {member.line_id || member.line_user_id}
                            </span>
                            <button
                              onClick={() => copyToClipboard(member.line_id || member.line_user_id || '', `line_${member.id}`)}
                              className="p-1 text-slate-400 hover:text-slate-600"
                              title="Salin ID LINE"
                            >
                              {copiedId === `line_${member.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-600 font-medium">Belum ada</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          {member.instagram_account ? (
                            <div className="flex items-center space-x-1 text-pink-700 font-medium text-[11px]">
                              <InstagramIcon className="w-3 h-3 text-pink-500" />
                              <span>{member.instagram_account}</span>
                            </div>
                          ) : null}
                          {member.whatsapp_number ? (
                            <div className="text-[10px] font-mono text-emerald-700">
                              WA: {member.whatsapp_number}
                            </div>
                          ) : null}
                          {!member.instagram_account && !member.whatsapp_number ? (
                            <span className="text-[11px] text-slate-400">-</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[11px] text-slate-700 font-medium">
                          {assignedGroupObj?.group_name || 'Semua Grup Aktif'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setSelectedStrip(member)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Lihat Detail Anggota"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {(currentRole === 'superadmin' || currentRole === 'logistik') && (
                            <button
                              onClick={() => handleQuickSelectAndDelete(member.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus Anggota Ini"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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

            {/* MEMBER DETAIL INSPECTION MODAL */}
      {selectedStrip && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-emerald-600">
                <Users className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">
                  Detail Anggota Komunitas MP
                </h3>
              </div>
              <button
                onClick={() => setSelectedStrip(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Profile Card */}
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4 text-xs">
              {/* Photo & Names */}
              <div className="flex items-center space-x-3.5 pb-3 border-b border-slate-200">
                {selectedStrip.photo_url ? (
                  <img
                    src={selectedStrip.photo_url}
                    alt={selectedStrip.full_name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500 shadow-sm"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold text-base flex items-center justify-center shadow-md">
                    {selectedStrip.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-bold text-slate-900 leading-tight">
                    {selectedStrip.full_name}
                  </h4>
                  {selectedStrip.baptismal_name && (
                    <p className="text-xs text-emerald-700 font-semibold flex items-center space-x-1 mt-0.5">
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      <span>{selectedStrip.baptismal_name}</span>
                    </p>
                  )}
                  <div className="mt-1.5 flex items-center space-x-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${COMMUNITY_ROLES.find((r) => r.id === (selectedStrip.community_role || 'anggota_aktif'))?.badge}`}>
                      {COMMUNITY_ROLES.find((r) => r.id === (selectedStrip.community_role || 'anggota_aktif'))?.label}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Status: <strong className="text-emerald-700">Aktif</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Tanggal Lahir & Pendidikan */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-white p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">TANGGAL LAHIR</span>
                  <span className="text-slate-900 font-bold font-mono">
                    {selectedStrip.birth_date} {MONTH_NAMES[selectedStrip.birth_month]}
                    {selectedStrip.birth_year ? ` (${selectedStrip.birth_year})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">KELAS & ANGKATAN</span>
                  <span className="text-slate-900 font-bold">
                    {selectedStrip.class_origin || '-'} {selectedStrip.entry_year ? `• Thn ${selectedStrip.entry_year}` : ''}
                  </span>
                </div>
              </div>

              {/* Kontak LINE & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">AKUN LINE</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-slate-800 font-bold text-xs truncate">
                      {selectedStrip.line_id || selectedStrip.line_user_id || 'Belum Ada LINE'}
                    </span>
                    {(selectedStrip.line_id || selectedStrip.line_user_id) && (
                      <button
                        onClick={() => copyToClipboard(selectedStrip.line_id || selectedStrip.line_user_id || '', 'inspect')}
                        className="text-slate-400 hover:text-emerald-600 p-1"
                        title="Salin LINE ID"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">WHATSAPP</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-slate-800 font-bold text-xs truncate">
                      {selectedStrip.whatsapp_number || 'Belum Ada WA'}
                    </span>
                    {selectedStrip.whatsapp_number && (
                      <button
                        onClick={() => copyToClipboard(selectedStrip.whatsapp_number || '', 'inspect_wa')}
                        className="text-slate-400 hover:text-emerald-600 p-1"
                        title="Salin No WA"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Instagram & Grup LINE */}
              <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Instagram:</span>
                  <div className="flex items-center space-x-1.5 font-bold text-pink-600">
                    <InstagramIcon className="w-3.5 h-3.5" />
                    <span>{selectedStrip.instagram_account || 'Belum diisi'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                  <span className="text-slate-500 font-medium">Grup LINE Siaran:</span>
                  <span className="font-bold text-slate-900">
                    {groups.find((g) => selectedStrip.assigned_groups?.includes(g.id) || selectedStrip.assigned_groups?.includes(g.group_id))?.group_name || 'Semua Grup Aktif'}
                  </span>
                </div>
                {selectedStrip.notes && (
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <span>Catatan: </span>
                    <span className="italic text-slate-700">{selectedStrip.notes}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex justify-between items-center text-xs">
              {(currentRole === 'superadmin' || currentRole === 'logistik') && (
                <button
                  onClick={() => {
                    handleQuickSelectAndDelete(selectedStrip.id);
                  }}
                  className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold flex items-center space-x-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Anggota Ini</span>
                </button>
              )}

              <button
                onClick={() => setSelectedStrip(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold ml-auto transition-colors"
              >
                Tutup
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
                <Users className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Tambah Data Anggota Ulang Tahun</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddMember} className="mt-4 space-y-3.5 text-xs">
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
                    placeholder="Contoh: 2006"
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Jabatan / Role Komunitas */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Jabatan / Role di Komunitas
                </label>
                <select
                  value={communityRole}
                  onChange={(e) => setCommunityRole(e.target.value as MemberCommunityRole)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  {COMMUNITY_ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
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
                    placeholder="Contoh: PPTI 26, XII MIPA 1"
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
                    placeholder="Contoh: 2026"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Akun LINE & Nomor WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Akun LINE (ID LINE / User ID)
                  </label>
                  <div className="relative">
                    <AtSign className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={lineUserId}
                      onChange={(e) => setLineUserId(e.target.value)}
                      placeholder="Contoh: cukurukuk0906"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nomor WhatsApp
                  </label>
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="Contoh: 08985816700"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>

              {/* Akun Instagram & Grup LINE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Grup LINE Tujuan
                  </label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none bg-white"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.group_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Anggota aktif divisi liturgi"
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-semibold shadow-sm transition-all"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Anggota'}
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
