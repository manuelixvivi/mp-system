'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import { getWibParts, getWibIsoDate } from '@/lib/time';
import { LineGroup, Member } from '@/types';
import {
  Radio,
  BookOpen,
  Gift,
  Send,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Users,
  Eye,
  Check,
  MessageSquare,
  Upload,
  Trash2,
  Phone,
  Sparkles,
} from 'lucide-react';

interface SelectedPIC {
  id: string;
  name: string;
  role: string;
  line_id?: string;
}

export default function ManualBroadcastStudioPage() {
  const { currentRole, currentUser } = useRole();
  const [selectedModule, setSelectedModule] = useState<'devotional' | 'birthday' | 'custom'>('devotional');
  const [groups, setGroups] = useState<LineGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  // Devotional & Birthday state
  const [customMessage, setCustomMessage] = useState('');
  const [useCustomMessage, setUseCustomMessage] = useState(false);
  const [devotional, setDevotional] = useState<any>(null);
  const [birthdayMembers, setBirthdayMembers] = useState<any[]>([]);

  // Custom broadcast state
  const [customMessageText, setCustomMessageText] = useState('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [officers, setOfficers] = useState<Member[]>([]);
  const [selectedPics, setSelectedPics] = useState<SelectedPIC[]>([]);

  // Shared state
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ success: boolean; message: string; errors?: string[] } | null>(null);

  // Set initial module based on URL param or user role
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mod = params.get('module');
      if (mod === 'custom' || mod === 'birthday' || mod === 'devotional') {
        setSelectedModule(mod as any);
        return;
      }
    }

    if (currentRole === 'liturgi') {
      setSelectedModule('devotional');
    } else if (currentRole === 'logistik') {
      setSelectedModule('birthday');
    } else if (currentRole === 'pubdok') {
      setSelectedModule('custom');
    }
  }, [currentRole]);

  useEffect(() => {
    async function loadData() {
      try {
        const [timeRes, grpRes, memRes] = await Promise.all([
          fetch('/api/time', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
          fetch('/api/groups', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ groups: [] })),
          fetch('/api/members', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ members: [] })),
        ]);

        const todayDate = timeRes?.wib?.day ?? getWibParts().day;
        const todayMonth = timeRes?.wib?.month ?? getWibParts().month;
        const todayIso = timeRes?.wib?.isoDate ?? getWibIsoDate();

        const devRes = await fetch(`/api/devotionals?date=${todayIso}`).then((r) => r.json()).catch(() => ({ devotional: null }));

        const grps: LineGroup[] = grpRes.groups || [];
        setGroups(grps);
        const initialSelected = grps.map((g) => g.id);
        setSelectedGroupIds(initialSelected);

        const allMembers: Member[] = memRes.members || [];
        const bdayMems = allMembers.filter(
          (m: any) =>
            m.status === 'active' &&
            Number(m.birth_date) === todayDate &&
            Number(m.birth_month) === todayMonth
        );
        setBirthdayMembers(bdayMems);

        // Filter officers for PIC candidate selection (all except standard 'anggota_aktif')
        const officerList = allMembers.filter(
          (m: Member) => m.community_role && m.community_role !== 'anggota_aktif'
        );
        setOfficers(officerList);

        if (devRes.devotional) {
          setDevotional(devRes.devotional);
        } else {
          setDevotional(null);
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Check role authorization for currently selected module
  const isAuthorized =
    currentRole === 'superadmin' ||
    (selectedModule === 'devotional' && currentRole === 'liturgi') ||
    (selectedModule === 'birthday' && currentRole === 'logistik') ||
    (selectedModule === 'custom' && (
      currentRole === 'liturgi' ||
      currentRole === 'logistik' ||
      currentRole === 'pubdok' ||
      ((currentUser as any)?.community_role && (currentUser as any)?.community_role !== 'anggota_aktif')
    ));

  const handleToggleGroup = (groupId: string) => {
    if (selectedGroupIds.includes(groupId)) {
      setSelectedGroupIds(selectedGroupIds.filter((id) => id !== groupId));
    } else {
      setSelectedGroupIds([...selectedGroupIds, groupId]);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setBroadcastResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/broadcast/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setImageUrl(data.url);
      } else {
        alert(data.error || 'Gagal mengunggah gambar ke Cloudinary');
      }
    } catch (err: any) {
      alert('Gagal mengunggah gambar: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleTogglePic = (officer: Member) => {
    setSelectedPics((prev) => {
      const exists = prev.some((p) => p.id === officer.id);
      if (exists) {
        return prev.filter((p) => p.id !== officer.id);
      } else {
        return [
          ...prev,
          {
            id: officer.id,
            name: officer.full_name,
            role: (officer.community_role || 'Pengurus').replace(/_/g, ' ').toUpperCase(),
            line_id: officer.line_id,
          },
        ];
      }
    });
  };

  const handleOpenConfirmModal = () => {
    if (selectedGroupIds.length === 0) {
      alert('Pilih minimal satu grup LINE tujuan.');
      return;
    }
    if (selectedModule === 'custom' && !customMessageText.trim()) {
      alert('Silakan tuliskan teks pesan / caption pengumuman terlebih dahulu.');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleExecuteBroadcast = async () => {
    setShowConfirmModal(false);
    setSending(true);
    setBroadcastResult(null);

    try {
      if (selectedModule === 'custom') {
        const res = await fetch('/api/broadcast/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target_group_ids: selectedGroupIds,
            message_text: customMessageText,
            image_url: imageUrl || undefined,
            pics: selectedPics,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setBroadcastResult({
            success: true,
            message: data.message || `Pesan custom berhasil dikirim ke ${data.recipientCount} grup LINE!`,
          });
          // Reset form
          setCustomMessageText('');
          setImageUrl('');
          setSelectedPics([]);
        } else {
          setBroadcastResult({
            success: false,
            message: data.error || 'Gagal mengirimkan pesan siaran custom ke LINE',
            errors: data.errors,
          });
        }
      } else {
        const res = await fetch('/api/broadcast/manual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            module: selectedModule,
            targetGroupIds: selectedGroupIds,
            customMessage: useCustomMessage ? customMessage : undefined,
            devotionalId: devotional?.id,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setBroadcastResult({
            success: true,
            message: `Siaran ${selectedModule} berhasil dikirimkan ke ${data.recipientCount} target!`,
          });
        } else {
          setBroadcastResult({
            success: false,
            message: data.error || 'Gagal mengirimkan siaran ke LINE',
          });
        }
      }
    } catch (err: any) {
      setBroadcastResult({
        success: false,
        message: err.message || 'Terjadi kesalahan sistem',
      });
    } finally {
      setSending(false);
    }
  };

  // Live preview text calculation
  let previewText = '';
  if (selectedModule === 'devotional') {
    previewText = useCustomMessage
      ? customMessage
      : devotional?.formatted_message || 'Belum ada renungan hari ini yang diapprove. Tulis pesan custom di bawah atau buat renungan di Audit Studio.';
  } else if (selectedModule === 'birthday') {
    const mentionNames = birthdayMembers.map((m) => `@${m.full_name}`).join(', ');
    previewText = `𝓱𝓪𝓹𝓹𝔂 𝓫𝓲𝓻𝓽𝓱𝓭𝓪𝔂 ${mentionNames || '@Member'} !\n\nYour birthday is a perfect reminder of this truth—that each day, and especially today, God’s love surrounds you, His grace renews you, and His mercies flow abundantly over your life. No matter what the past year held, His faithfulness has brought you through, and His promises are the foundation for all the joy and blessings awaiting you in the year ahead.\n\n"𝑻𝒉𝒆 𝒔𝒕𝒆𝒂𝒅𝒇𝒂𝒔𝒕 𝒍𝒐𝒗𝒆 𝒐𝒇 𝒕𝒉𝒆 𝑳𝒐𝒓𝒅 𝒏𝒆𝒗𝒆𝒓 𝒄𝒆𝒂𝒔𝒆𝒔; 𝑯𝒊𝒔 𝒎𝒆𝒓𝒄𝒊𝒆𝒔 𝒏𝒆𝒗𝒆𝒓 𝒄𝒐𝒎𝒆 𝒕𝒐 𝒂𝒏 𝒆𝒏𝒅; 𝒕𝒉𝒆𝒚 𝒂𝒓𝒆 𝒏𝒆𝒘 𝒆𝒗𝒆𝒓𝒚 𝒎𝒐𝒓𝒏𝒊𝒏𝒈."\n— 𝙻𝚊𝚖𝚎𝚗𝚝𝚊𝚝𝚒𝚘𝚗𝚜 3:22-23`;
  } else {
    let picFooter = '';
    if (selectedPics.length > 0) {
      picFooter = '\n\n📌 PIC / Kontak Penanggung Jawab:\n' +
        selectedPics
          .map((p) => {
            const roleStr = p.role ? ` (${p.role})` : '';
            const lineStr = p.line_id ? ` — LINE: @${p.line_id.replace(/^@/, '')}` : '';
            return `• ${p.name}${roleStr}${lineStr}`;
          })
          .join('\n');
    }
    previewText = customMessageText.trim()
      ? `${customMessageText.trim()}${picFooter}`
      : `Halo Rekan-rekan! 👋\n\n(Tulis pesan pengumuman atau caption di form sebelah kiri untuk melihat simulasi tampilan di sini)${picFooter}`;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full font-medium inline-flex mb-2">
            <Radio className="w-3.5 h-3.5" />
            <span>Manual Broadcast Studio • Pusat Pengiriman Terpadu</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Broadcast Studio</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kirimkan siaran renungan harian, ucapan ulang tahun, atau pesan custom grup dengan poster Cloudinary Full HD secara terpadu.
          </p>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-400 block uppercase font-medium">Kewenangan Role Anda</span>
          <span className="text-xs font-semibold text-slate-800">
            {currentRole === 'superadmin' && 'Semua Modul (Devotional, Birthday, & Custom)'}
            {currentRole === 'liturgi' && 'Daily Devotional & Pesan Custom'}
            {currentRole === 'logistik' && 'Birthday Automation & Pesan Custom'}
            {currentRole === 'pubdok' && 'Pesan Custom Grup (Foto & Poster HD)'}
          </span>
        </div>
      </div>

      {/* Broadcast Result Message */}
      {broadcastResult && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            broadcastResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {broadcastResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <div>
              <p className="font-semibold">{broadcastResult.message}</p>
              {broadcastResult.errors && broadcastResult.errors.length > 0 && (
                <ul className="list-disc pl-4 mt-1 text-[11px] text-rose-700">
                  {broadcastResult.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <button onClick={() => setBroadcastResult(null)} className="text-slate-400 hover:text-slate-600 ml-4">
            &times;
          </button>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Configuration Form */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          {/* 1. Module Selector (3 Columns) */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">
              1. Pilih Tipe Siaran
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Devotional Option */}
              <button
                type="button"
                onClick={() => setSelectedModule('devotional')}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  selectedModule === 'devotional'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 mb-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      selectedModule === 'devotional' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-900">Daily Devotional</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Coffee Break with God</p>
                  <span className="text-[10px] text-emerald-700 font-medium block mt-1">
                    Liturgi & Superadmin
                  </span>
                </div>
              </button>

              {/* Birthday Option */}
              <button
                type="button"
                onClick={() => setSelectedModule('birthday')}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  selectedModule === 'birthday'
                    ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 mb-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      selectedModule === 'birthday' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Gift className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-900">Birthday Automation</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Ucapan & LINE mention</p>
                  <span className="text-[10px] text-blue-700 font-medium block mt-1">
                    Logistik & Superadmin
                  </span>
                </div>
              </button>

              {/* Custom Message Option */}
              <button
                type="button"
                onClick={() => setSelectedModule('custom')}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  selectedModule === 'custom'
                    ? 'border-purple-500 bg-purple-50/50 ring-2 ring-purple-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5 mb-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      selectedModule === 'custom' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-900">Pesan Custom Grup</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Pengumuman & Poster HD</p>
                  <span className="text-[10px] text-purple-700 font-medium block mt-1">
                    Semua Pengurus Divisi
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Access Warning if unauthorized */}
          {!isAuthorized && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center space-x-3 text-amber-800 text-xs">
              <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="font-bold">Akses Ditolak Sesuai PRD</p>
                <p className="text-[11px] mt-0.5">
                  Role Anda ({currentUser.role}) tidak memiliki wewenang untuk modul {selectedModule}. Hanya divisi yang berwenang yang dapat mengirimkan siaran ini.
                </p>
              </div>
            </div>
          )}

          {/* 2. Target LINE Groups Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                2. Pilih Grup LINE Tujuan
              </label>
              {groups.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedGroupIds(
                      selectedGroupIds.length === groups.length ? [] : groups.map((g) => g.id)
                    )
                  }
                  className="text-[11px] text-emerald-600 hover:underline font-medium"
                >
                  {selectedGroupIds.length === groups.length ? 'Batal Pilih Semua' : 'Pilih Semua Grup'}
                </button>
              )}
            </div>

            {groups.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                Belum ada grup LINE yang terdaftar. Tambahkan grup di{' '}
                <Link href="/dashboard/groups" className="text-emerald-600 font-medium underline">
                  Manajemen Grup LINE
                </Link>.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {groups.map((grp) => {
                  const isSelected = selectedGroupIds.includes(grp.id);
                  return (
                    <div
                      key={grp.id}
                      onClick={() => handleToggleGroup(grp.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/40'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border ${
                            isSelected
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{grp.group_name}</p>
                          <p className="text-[10px] text-slate-400">
                            {grp.group_id} • {grp.member_count} Anggota
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                        {grp.assigned_modules?.join(', ') || 'Semua Modul'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Module Specific Inputs */}
          {selectedModule === 'custom' ? (
            /* Custom Broadcast Options */
            <div className="space-y-4 pt-2 border-t border-slate-100">
              {/* 3.1 Poster / Image Upload */}
              <div>
                <label className="text-xs font-semibold text-slate-800 uppercase tracking-wider block mb-1">
                  3. Lampirkan Gambar / Poster HD (Opsional)
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  Gambar disimpan di <strong>Cloudinary Full HD</strong> tanpa kompresi dan tanpa blur.
                </p>

                {imageUrl ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={imageUrl}
                        alt="Uploaded preview"
                        className="w-14 h-14 object-cover rounded-lg border border-slate-300 shadow-sm"
                      />
                      <div>
                        <p className="font-semibold text-emerald-700 text-xs flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Gambar HD Siap Dikirim</span>
                        </p>
                        <p className="text-[10px] text-slate-400 truncate max-w-xs">{imageUrl}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 hover:border-purple-400 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-purple-50/30 transition-all">
                    <Upload className="w-6 h-6 text-slate-400 mb-1.5" />
                    <span className="font-semibold text-slate-700 text-xs">
                      {uploadingImage ? 'Mengunggah ke Cloudinary HD...' : 'Pilih Gambar / Poster HD'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, JPEG (Kualitas Asli Full HD)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* 3.2 Caption / Message Text */}
              <div>
                <label className="text-xs font-semibold text-slate-800 uppercase tracking-wider block mb-1">
                  4. Teks Pesan / Caption Pengumuman
                </label>
                <textarea
                  rows={4}
                  value={customMessageText}
                  onChange={(e) => setCustomMessageText(e.target.value)}
                  placeholder="Tuliskan isi pengumuman atau caption siaran custom di sini..."
                  className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-sans leading-relaxed resize-y"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>Mendukung emoji dan format paragraf.</span>
                  <span>{customMessageText.length} karakter</span>
                </div>
              </div>

              {/* 3.3 PIC Multi-Select */}
              <div>
                <label className="text-xs font-semibold text-slate-800 uppercase tracking-wider block mb-1">
                  5. Pilih PIC / Kontak Penanggung Jawab (Multi-select)
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  Kontak pengurus yang dipilih akan otomatis disertakan di bagian bawah pesan sebagai rujukan anggota.
                </p>

                {officers.length === 0 ? (
                  <p className="text-slate-400 text-xs italic">Belum ada data pengurus di database.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 border border-slate-100 rounded-xl">
                    {officers.map((officer) => {
                      const isSelected = selectedPics.some((p) => p.id === officer.id);
                      return (
                        <button
                          key={officer.id}
                          type="button"
                          onClick={() => handleTogglePic(officer)}
                          className={`px-2.5 py-1 rounded-full border text-xs flex items-center space-x-1.5 transition-all ${
                            isSelected
                              ? 'bg-purple-600 border-purple-600 text-white font-semibold shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span>{officer.full_name}</span>
                          <span className={`text-[10px] ${isSelected ? 'text-purple-100' : 'text-slate-400'}`}>
                            ({(officer.community_role || 'Pengurus').replace(/_/g, ' ')})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Devotional / Birthday Content Override */
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  3. Override Konten Pesan (Opsional)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="useCustom"
                    checked={useCustomMessage}
                    onChange={(e) => setUseCustomMessage(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                  />
                  <label htmlFor="useCustom" className="text-xs text-slate-600 cursor-pointer">
                    Kustomisasi Teks Pesan
                  </label>
                </div>
              </div>

              {useCustomMessage && (
                <textarea
                  rows={5}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Tulis pesan kustom Anda di sini..."
                  className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono leading-relaxed"
                />
              )}
            </div>
          )}

          {/* Execution Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Target: <strong className="text-slate-800">{selectedGroupIds.length}</strong> grup terpilih
              {selectedModule === 'custom' && selectedPics.length > 0 && (
                <span> • <strong className="text-purple-700">{selectedPics.length}</strong> PIC</span>
              )}
            </span>

            <button
              type="button"
              disabled={!isAuthorized || selectedGroupIds.length === 0 || sending || uploadingImage}
              onClick={handleOpenConfirmModal}
              className={`inline-flex items-center space-x-2 px-5 py-2.5 text-white text-xs font-semibold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedModule === 'custom'
                  ? 'bg-purple-600 hover:bg-purple-500'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>{sending ? 'Mengirim Siaran...' : 'Kirim Siaran Sekarang'}</span>
            </button>
          </div>
        </div>

        {/* Right Column (5 cols): Live Preview Card */}
        <div className="lg:col-span-5 bg-slate-900 text-white rounded-xl p-5 shadow-lg border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-1.5">
                <Eye className="w-4 h-4" />
                <span>Live LINE Preview (Yang Diterima Grup)</span>
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                {selectedModule === 'devotional' && 'Coffee Break'}
                {selectedModule === 'birthday' && 'textV2 Mention'}
                {selectedModule === 'custom' && (imageUrl ? 'Image + Text' : 'Text Bubble')}
              </span>
            </div>

            {/* Custom Mode with Image Preview */}
            {selectedModule === 'custom' && imageUrl && (
              <div className="mb-3 rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                <img src={imageUrl} alt="Poster HD Preview" className="w-full object-cover max-h-52" />
                <div className="p-2 bg-slate-900/90 text-[10px] text-emerald-400 flex items-center justify-between">
                  <span className="flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Cloudinary Full HD (Original Resolution)</span>
                  </span>
                  <span className="text-slate-400">Pesan #1 Gambar</span>
                </div>
              </div>
            )}

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-sans text-slate-200 leading-relaxed whitespace-pre-wrap max-h-[460px] overflow-y-auto">
              {previewText}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            <p className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Proteksi anti double submission aktif. ID unik idempotency disematkan ke setiap siaran.</span>
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-amber-600 mb-3">
              <div className="p-2 bg-amber-50 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Konfirmasi Broadcast Studio</h3>
                <p className="text-xs text-slate-500">Pesan siaran akan langsung diteruskan ke grup LINE.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs space-y-1.5 my-4">
              <p>
                <span className="text-slate-500">Modul Siaran:</span>{' '}
                <strong className="text-slate-900 uppercase">
                  {selectedModule === 'devotional' && 'Daily Devotional'}
                  {selectedModule === 'birthday' && 'Birthday Automation'}
                  {selectedModule === 'custom' && 'Pesan Custom Grup'}
                </strong>
              </p>
              <p>
                <span className="text-slate-500">Jumlah Grup Tujuan:</span>{' '}
                <strong className="text-slate-900">{selectedGroupIds.length} Grup</strong>
              </p>
              <p>
                <span className="text-slate-500">Pengirim:</span>{' '}
                <strong className="text-slate-900">{currentUser.name}</strong> ({currentRole})
              </p>
              {selectedModule === 'custom' && (
                <>
                  <p>
                    <span className="text-slate-500">Poster / Foto:</span>{' '}
                    <strong className={imageUrl ? 'text-emerald-700' : 'text-slate-600'}>
                      {imageUrl ? 'Ada (Cloudinary Full HD)' : 'Tanpa Gambar'}
                    </strong>
                  </p>
                  <p>
                    <span className="text-slate-500">PIC Disematkan:</span>{' '}
                    <strong className="text-purple-700">{selectedPics.length} Kontak Petugas</strong>
                  </p>
                </>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteBroadcast}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md"
              >
                Ya, Konfirmasi & Kirim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
