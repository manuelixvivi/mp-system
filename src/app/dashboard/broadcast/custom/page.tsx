'use client';

import React, { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { LineGroup, Member } from '@/types';
import {
  Send,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Users,
  Shield,
  Trash2,
  Sparkles,
  Phone,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';

interface SelectedPIC {
  id: string;
  name: string;
  role: string;
  line_id?: string;
}

export default function CustomBroadcastPage() {
  const { currentRole, currentUser } = useRole();

  const [groups, setGroups] = useState<LineGroup[]>([]);
  const [officers, setOfficers] = useState<Member[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [messageText, setMessageText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedPics, setSelectedPics] = useState<SelectedPIC[]>([]);

  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string; errors?: string[] } | null>(null);

  // Authorization check: Only officers/divisi (all except 'anggota_aktif')
  const isAuthorized =
    currentRole === 'superadmin' ||
    currentRole === 'liturgi' ||
    currentRole === 'logistik' ||
    currentRole === 'pubdok' ||
    (currentUser as any)?.community_role !== 'anggota_aktif';

  useEffect(() => {
    // 1. Fetch LINE Groups
    fetch('/api/groups', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.groups) {
          const activeOnly = data.groups.filter((g: LineGroup) => g.is_active);
          setGroups(activeOnly);
          // Default select all active groups
          setSelectedGroupIds(activeOnly.map((g: LineGroup) => g.id));
        }
      })
      .catch((e) => console.error(e));

    // 2. Fetch Members to identify Officers / PIC candidates
    fetch('/api/members', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.members) {
          // Officers are members with specific non-anggota_aktif roles
          const officerList = data.members.filter(
            (m: Member) => m.community_role && m.community_role !== 'anggota_aktif'
          );
          setOfficers(officerList);
        }
      })
      .catch((e) => console.error(e));
  }, []);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setUploadingImage(true);
    setSendResult(null);

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

  const handleToggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
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
            role: (officer.community_role || 'Pengurus').replace('_', ' ').toUpperCase(),
            line_id: officer.line_id,
          },
        ];
      }
    });
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) {
      alert('Silakan masukkan pesan atau caption terlebih dahulu.');
      return;
    }

    if (selectedGroupIds.length === 0) {
      alert('Pilih minimal satu grup LINE tujuan.');
      return;
    }

    setSending(true);
    setSendResult(null);

    try {
      const res = await fetch('/api/broadcast/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_group_ids: selectedGroupIds,
          message_text: messageText,
          image_url: imageUrl || undefined,
          pics: selectedPics,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSendResult({
          success: true,
          message: data.message || 'Pesan siaran berhasil dikirim ke grup LINE!',
        });
        // Reset form
        setMessageText('');
        setImageUrl('');
        setImageFile(null);
      } else {
        setSendResult({
          success: false,
          message: data.error || 'Gagal mengirim pesan siaran custom.',
          errors: data.errors,
        });
      }
    } catch (err: any) {
      setSendResult({
        success: false,
        message: err.message || 'Terjadi kesalahan jaringan.',
      });
    } finally {
      setSending(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-rose-200 rounded-2xl shadow-sm text-center space-y-4">
        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Akses Ditolak</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Fitur Pesan Custom ke Grup hanya dapat diakses oleh petugas atau pengurus divisi (Ketua, Liturgi, Logistik, Pubdok, Bendahara, dll). Anggota aktif biasa tidak memiliki izin ini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full font-medium inline-flex mb-2">
            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
            <span>Fitur Komunikasi Divisi & Pengurus</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Kirim Pesan Custom ke Grup LINE</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kirimkan pengumuman resmi, poster HD Cloudinary, dan kontak PIC langsung ke grup LINE komunitas.
          </p>
        </div>

        {sendResult && (
          <div
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 border shadow-sm ${
              sendResult.success
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {sendResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{sendResult.message}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <form onSubmit={handleSendBroadcast} className="space-y-5 text-xs">
            {/* 1. Target Groups */}
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <label className="font-bold text-slate-900 text-sm">1. Pilih Grup LINE Target</label>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedGroupIds(
                      selectedGroupIds.length === groups.length ? [] : groups.map((g) => g.id)
                    )
                  }
                  className="text-blue-600 text-[11px] hover:underline font-semibold"
                >
                  {selectedGroupIds.length === groups.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                </button>
              </div>

              {groups.length === 0 ? (
                <p className="text-slate-400 italic">Tidak ada grup LINE aktif ditemukan.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {groups.map((group) => {
                    const checked = selectedGroupIds.includes(group.id);
                    return (
                      <label
                        key={group.id}
                        onClick={() => handleToggleGroup(group.id)}
                        className={`p-3 rounded-lg border flex items-center space-x-2.5 cursor-pointer transition-all ${
                          checked
                            ? 'bg-blue-50/70 border-blue-300 text-blue-900 font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}}
                          className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="truncate text-xs">{group.group_name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Upload Image (Optional) */}
            <div>
              <label className="font-bold text-slate-900 text-sm block mb-1">
                2. Lampirkan Gambar / Poster HD (Opsional)
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
                        <span>Gambar HD Terunggah di Cloudinary</span>
                      </p>
                      <p className="text-[10px] text-slate-400 truncate max-w-xs">{imageUrl}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrl('');
                      setImageFile(null);
                    }}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-blue-50/40 transition-all">
                  <Upload className="w-7 h-7 text-slate-400 mb-2" />
                  <span className="font-semibold text-slate-700 text-xs">
                    {uploadingImage ? 'Mengunggah ke Cloudinary HD...' : 'Klik untuk Pilih Foto / Poster'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, atau JPEG (Maks. 10MB)</span>
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

            {/* 3. Message / Caption Text */}
            <div>
              <label className="font-bold text-slate-900 text-sm block mb-1">
                3. Teks Pesan / Caption Pengumuman
              </label>
              <textarea
                rows={5}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Tuliskan isi pengumuman atau pesan custom untuk grup di sini..."
                className="w-full p-3 border border-slate-300 rounded-xl font-sans text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>Dapat menggunakan emoji dan baris baru.</span>
                <span>{messageText.length} karakter</span>
              </div>
            </div>

            {/* 4. Select PIC (Multi-selected) */}
            <div>
              <label className="font-bold text-slate-900 text-sm block mb-1">
                4. Pilih PIC / Kontak Penanggung Jawab (Multi-select)
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                Kontak pengurus yang dipilih akan otomatis disertakan di bagian bawah pesan sebagai rujukan anggota.
              </p>

              {officers.length === 0 ? (
                <p className="text-slate-400 italic">Belum ada data pengurus/petugas di database.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {officers.map((officer) => {
                    const isSelected = selectedPics.some((p) => p.id === officer.id);
                    return (
                      <button
                        key={officer.id}
                        type="button"
                        onClick={() => handleTogglePic(officer)}
                        className={`px-3 py-1.5 rounded-full border text-xs flex items-center space-x-1.5 transition-all ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white font-semibold shadow-sm'
                            : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200/80'
                        }`}
                      >
                        <span>{officer.full_name}</span>
                        <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                          ({officer.community_role?.replace('_', ' ') || 'Pengurus'})
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Target Siaran: <strong>{selectedGroupIds.length} Grup</strong> | PIC:{' '}
                <strong>{selectedPics.length} Orang</strong>
              </span>

              <button
                type="submit"
                disabled={sending || uploadingImage || selectedGroupIds.length === 0}
                className="inline-flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{sending ? 'Mengirim ke Grup LINE...' : 'Kirim Pesan ke Grup Sekarang'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Phone / Chat Preview (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>Preview Tampilan di Chat LINE</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulasi tampilan pesan yang akan diterima anggota di grup LINE.
            </p>
          </div>

          {/* Smartphone Frame Simulation */}
          <div className="mt-4 flex-1 bg-slate-900 rounded-3xl p-3 shadow-xl max-w-sm mx-auto w-full border-4 border-slate-800">
            {/* Phone Screen */}
            <div className="bg-[#7288a2] rounded-2xl p-3 min-h-[420px] flex flex-col justify-end text-xs space-y-3">
              {/* Message Bubble Container */}
              <div className="space-y-2">
                {/* Optional Image */}
                {imageUrl && (
                  <div className="max-w-[280px] rounded-xl overflow-hidden shadow-md border border-white/20">
                    <img src={imageUrl} alt="Preview" className="w-full object-cover max-h-56" />
                  </div>
                )}

                {/* Text Bubble */}
                <div className="bg-white text-slate-900 p-3.5 rounded-2xl rounded-tl-sm shadow-md max-w-[280px] space-y-2 leading-relaxed">
                  <p className="whitespace-pre-wrap text-[11px]">
                    {messageText || 'Halo teman-teman! [Isi pengumuman Anda akan tampil di sini...]'}
                  </p>

                  {/* PIC Signature Footer */}
                  {selectedPics.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-600 space-y-0.5">
                      <p className="font-semibold text-slate-800">📌 PIC / Kontak Penanggung Jawab:</p>
                      {selectedPics.map((p) => (
                        <p key={p.id} className="text-slate-600">
                          • {p.name} ({p.role}) {p.line_id ? `— LINE: @${p.line_id.replace(/^@/, '')}` : ''}
                        </p>
                      ))}
                    </div>
                  )}

                  <span className="text-[9px] text-slate-400 block text-right mt-1">12:00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
