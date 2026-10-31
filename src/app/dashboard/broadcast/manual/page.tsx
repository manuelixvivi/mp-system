'use client';

import React, { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { LineGroup } from '@/types';
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
} from 'lucide-react';

export default function ManualBroadcastStudioPage() {
  const { currentRole, currentUser } = useRole();
  const [selectedModule, setSelectedModule] = useState<'devotional' | 'birthday'>('devotional');
  const [groups, setGroups] = useState<LineGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [useCustomMessage, setUseCustomMessage] = useState(false);
  const [devotional, setDevotional] = useState<any>(null);
  const [birthdayMembers, setBirthdayMembers] = useState<any[]>([]);

  // State
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<any>(null);

  // Set initial module based on role
  useEffect(() => {
    if (currentRole === 'liturgi') {
      setSelectedModule('devotional');
    } else if (currentRole === 'logistik') {
      setSelectedModule('birthday');
    }
  }, [currentRole]);

  useEffect(() => {
    async function loadData() {
      try {
        const [grpRes, memRes] = await Promise.all([
          fetch('/api/groups').then((r) => r.json()),
          fetch('/api/members').then((r) => r.json()),
        ]);

        const grps: LineGroup[] = grpRes.groups || [];
        setGroups(grps);
        // Default select all groups supporting current module
        const initialSelected = grps.map((g) => g.id);
        setSelectedGroupIds(initialSelected);

        const today = new Date();
        const bdayMems = (memRes.members || []).filter(
          (m: any) => m.birth_date === today.getDate() && m.birth_month === today.getMonth() + 1
        );
        setBirthdayMembers(bdayMems);

        // Sample devotional
        setDevotional({
          id: '99999999-9999-9999-9999-999999999901',
          verse_reference: 'Roma 12:2',
          formatted_message: `╔═══════☩══♛══☩═══════╗
 ☕ 𝐂𝐎𝐅𝐅𝐄𝐄 𝐁𝐑𝐄𝐀𝐊 𝐖𝐈𝐓𝐇 𝐆𝐎𝐃 ✝️
╚═══════☩══✦══☩═══════╝

📖 𝗩𝗲𝗿𝘀𝗲 𝗼𝗳 𝗧𝗵𝗲 𝗗𝗮𝘆 ⋆⋅☆
Roma 12:2
"Janganlah kamu menjadi serupa dengan dunia ini, tetapi berubahlah oleh pembaruan budimu, sehingga kamu dapat membedakan manakah kehendak Allah: apa yang baik, yang berkenan kepada Allah dan yang sempurna."

💭 𝗧𝗼𝗱𝗮𝘆’ｓ 𝗥𝗲𝗳𝗹𝗲𝗰𝘁𝗶𝗼𝗻 ✧◦°˚°◦♡
Dalam kesibukan harian kita yang sering kali bising dan dipenuhi oleh standar duniawi, Tuhan mengundang kita untuk berhenti sejenak. Memperbarui budi berarti mengarahkan pandangan kita kembali kepada Kristus, menyelaraskan setiap keputusan dan perbuatan dengan firman-Nya.

🧠 𝗠𝗶𝗻𝗱 𝗖𝗵𝗲𝗰𝗸 +✟+
Apakah hari ini tindakanku lebih banyak didorong oleh opini orang sekitar atau kerinduan menyenangkan hati Tuhan?

✨ 𝗧𝗮𝗸𝗲 𝗢𝗻𝗲 𝗦𝘁𝗲𝗽 ⋆ ᭝ ᨳଓ ՟
Ambil jeda 3 menit hari ini untuk mendoakan seseorang yang sedang membuatmu merasa kesal atau lelah.

“𝓞𝓷𝓮 𝓿𝓮𝓻𝓼𝓮.
𝓞𝓷𝓮 𝓻𝓮𝓯𝓵𝓮𝓬𝓽𝓲𝓸𝓷.
𝓞𝓷𝓮 𝓼𝓽𝓮𝓹 𝓬𝓵𝓸𝓼𝓮𝓻 𝓽𝓸 𝓗𝓲𝓶.”`,
        });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Check role authorization for current selected module
  const isAuthorized =
    currentRole === 'superadmin' ||
    (currentRole === 'liturgi' && selectedModule === 'devotional') ||
    (currentRole === 'logistik' && selectedModule === 'birthday');

  const handleToggleGroup = (groupId: string) => {
    if (selectedGroupIds.includes(groupId)) {
      setSelectedGroupIds(selectedGroupIds.filter((id) => id !== groupId));
    } else {
      setSelectedGroupIds([...selectedGroupIds, groupId]);
    }
  };

  const handleExecuteBroadcast = async () => {
    setShowConfirmModal(false);
    setSending(true);
    setBroadcastResult(null);

    try {
      const res = await fetch('/api/broadcast/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: selectedModule,
          targetGroupIds: selectedGroupIds,
          senderProfileId: currentUser.id,
          customMessage: useCustomMessage ? customMessage : undefined,
          devotionalId: devotional?.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setBroadcastResult({
          success: true,
          message: data.message || 'Broadcast manual berhasil dikirimkan ke LINE!',
          sentCount: data.sentCount,
        });
      } else {
        setBroadcastResult({
          success: false,
          message: data.error || 'Gagal mengirimkan broadcast.',
        });
      }
    } catch (err: any) {
      setBroadcastResult({
        success: false,
        message: err.message || 'Network error',
      });
    } finally {
      setSending(false);
    }
  };

  // Preview text calculation
  let previewText = '';
  if (selectedModule === 'devotional') {
    previewText = useCustomMessage ? customMessage : devotional?.formatted_message || '';
  } else {
    const mentionNames = birthdayMembers.map((m) => `@${m.full_name}`).join(', ');
    previewText = `𝓱𝓪𝓹𝓹𝔂 𝓫𝓲𝓻𝓽𝓱𝓭𝓪𝔂 ${mentionNames || '@Member'} !\n\nYour birthday is a perfect reminder of this truth—that each day, and especially today, God’s love surrounds you, His grace renews you, and His mercies flow abundantly over your life. No matter what the past year held, His faithfulness has brought you through, and His promises are the foundation for all the joy and blessings awaiting you in the year ahead.\n\n"𝑻𝒉𝒆 𝒔𝒕𝒆𝒂𝒅𝒇𝒂𝒔𝒕 𝒍𝒐𝒗𝒆 𝒐𝒇 𝒕𝒉𝒆 𝑳𝒐𝒓𝒅 𝒏𝒆𝒗𝒆𝒓 𝒄𝒆𝒂𝒔𝒆𝒔; 𝑯𝒊𝒔 𝒎𝒆𝒓𝒄𝒊𝒆𝒔 𝒏𝒆𝒗𝒆𝒓 𝒄𝒐𝒎𝒆 𝒕𝒐 𝒂𝒏 𝒆𝒏𝒅; 𝒕𝒉𝒆𝒚 𝒂𝒓𝒆 𝒏𝒆𝒘 𝒆𝒗𝒆𝒓𝒚 𝒎𝒐𝒓𝒏𝒊𝒏𝒈."\n— 𝙻𝚊𝚖𝚎𝚗𝚝𝚊𝚝𝚒𝚘𝚗𝚜 3:22-23`;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full font-medium inline-flex mb-2">
            <Radio className="w-3.5 h-3.5" />
            <span>Manual Broadcast System • Proteksi Konfirmasi Wajib</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Manual Broadcast Studio</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kirimkan siaran renungan atau ucapan ulang tahun secara instan ke grup LINE sesuai kewenangan modul role Anda.
          </p>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-400 block uppercase font-medium">Kewenangan Role</span>
          <span className="text-xs font-semibold text-slate-800">
            {currentRole === 'superadmin' && 'Semua Modul (Devotional & Birthday)'}
            {currentRole === 'liturgi' && 'Daily Devotional Sahaja'}
            {currentRole === 'logistik' && 'Birthday Automation Sahaja'}
          </span>
        </div>
      </div>

      {broadcastResult && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            broadcastResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {broadcastResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            )}
            <span className="font-medium">{broadcastResult.message}</span>
          </div>
          <button onClick={() => setBroadcastResult(null)} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Configuration & Target Groups */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          {/* 1. Module Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">
              1. Pilih Modul Broadcast
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Daily Devotional Option */}
              <button
                type="button"
                onClick={() => setSelectedModule('devotional')}
                className={`p-4 rounded-xl border text-left transition-all flex items-start space-x-3 ${
                  selectedModule === 'devotional'
                    ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    selectedModule === 'devotional' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Daily Devotional</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Coffee Break with God</p>
                  <span className="text-[10px] text-emerald-700 font-medium block mt-1">
                    Role: Liturgi & Superadmin
                  </span>
                </div>
              </button>

              {/* Birthday Option */}
              <button
                type="button"
                onClick={() => setSelectedModule('birthday')}
                className={`p-4 rounded-xl border text-left transition-all flex items-start space-x-3 ${
                  selectedModule === 'birthday'
                    ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    selectedModule === 'birthday' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Gift className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Birthday Automation</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Ucapan dengan LINE mention</p>
                  <span className="text-[10px] text-blue-700 font-medium block mt-1">
                    Role: Logistik & Superadmin
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
                  Role Anda ({currentUser.role}) tidak memiliki wewenang untuk modul {selectedModule}. Hanya role yang berwenang yang dapat mengirimkan siaran ini.
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
              <button
                type="button"
                onClick={() => setSelectedGroupIds(groups.map((g) => g.id))}
                className="text-[11px] text-emerald-600 hover:underline font-medium"
              >
                Pilih Semua Grup
              </button>
            </div>

            <div className="space-y-2">
              {groups.map((grp) => {
                const isSelected = selectedGroupIds.includes(grp.id);
                return (
                  <div
                    key={grp.id}
                    onClick={() => handleToggleGroup(grp.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/40'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
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
                      Broadcast-Only
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Action Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Target: <strong className="text-slate-800">{selectedGroupIds.length}</strong> grup terpilih
            </span>

            <button
              type="button"
              disabled={!isAuthorized || selectedGroupIds.length === 0 || sending}
              onClick={() => setShowConfirmModal(true)}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl shadow-md transition-all active:scale-95"
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
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                {selectedModule === 'devotional' ? 'Coffee Break' : 'textV2 Mention'}
              </span>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-sans text-slate-200 leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
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

      {/* Confirmation Modal (PRD Requirement 6.5) */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-amber-600 mb-3">
              <div className="p-2 bg-amber-50 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Konfirmasi Broadcast Manual</h3>
                <p className="text-xs text-slate-500">Pesan akan langsung dikirim ke LINE.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs space-y-1.5 my-4">
              <p>
                <span className="text-slate-500">Modul:</span>{' '}
                <strong className="text-slate-900 uppercase">{selectedModule}</strong>
              </p>
              <p>
                <span className="text-slate-500">Jumlah Grup Tujuan:</span>{' '}
                <strong className="text-slate-900">{selectedGroupIds.length} Grup</strong>
              </p>
              <p>
                <span className="text-slate-500">Pengirim:</span>{' '}
                <strong className="text-slate-900">{currentUser.name}</strong> ({currentRole})
              </p>
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
