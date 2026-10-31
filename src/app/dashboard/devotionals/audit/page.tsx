'use client';

import React, { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Save,
  Send,
  Eye,
  RefreshCw,
  Sparkles,
  BookOpen,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';

export default function DevotionalAuditPage() {
  const { currentRole, currentUser } = useRole();
  const [devotional, setDevotional] = useState<any>(null);
  const [source, setSource] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states for editable fields
  const [verseRef, setVerseRef] = useState('');
  const [verseText, setVerseText] = useState('');
  const [reflection, setReflection] = useState('');
  const [mindCheck, setMindCheck] = useState('');
  const [takeOneStep, setTakeOneStep] = useState('');
  const [auditNotes, setAuditNotes] = useState('');

  // Initial load
  useEffect(() => {
    async function loadDevotional() {
      try {
        const todayIso = new Date().toISOString().split('T')[0];
        // Fetch current devotional
        const res = await fetch(`/api/cron/devotional-scrape`, { method: 'GET' });
        // Also fetch from API or store
      } catch (e) {
        console.error(e);
      } finally {
        // Set sample state
        const initial = {
          id: '99999999-9999-9999-9999-999999999901',
          devotional_date: new Date().toISOString().split('T')[0],
          verse_reference: 'Roma 12:2',
          verse_text:
            'Janganlah kamu menjadi serupa dengan dunia ini, tetapi berubahlah oleh pembaruan budimu, sehingga kamu dapat membedakan manakah kehendak Allah: apa yang baik, yang berkenan kepada Allah dan yang sempurna.',
          reflection:
            'Dalam kesibukan harian kita yang sering kali bising dan dipenuhi oleh standar duniawi, Tuhan mengundang kita untuk berhenti sejenak. Memperbarui budi berarti mengarahkan pandangan kita kembali kepada Kristus, menyelaraskan setiap keputusan dan perbuatan dengan firman-Nya.',
          mind_check:
            'Apakah hari ini tindakanku lebih banyak didorong oleh opini orang sekitar atau kerinduan menyenangkan hati Tuhan?',
          take_one_step:
            'Ambil jeda 3 menit hari ini untuk mendoakan seseorang yang sedang membuatmu merasa kesal atau lelah.',
          audit_status: 'approved',
          is_fallback_eligible: true,
          last_audited_by: 'Sr. Clara Bernadeth',
          last_audited_at: new Date().toISOString(),
        };

        setDevotional(initial);
        setVerseRef(initial.verse_reference);
        setVerseText(initial.verse_text);
        setReflection(initial.reflection);
        setMindCheck(initial.mind_check);
        setTakeOneStep(initial.take_one_step);

        setSource({
          url: 'https://www.thekatolik.com/2026/10/renungan-harian-katolik-hari-ini.html',
          title: 'Renungan Harian Katolik: Berani Berubah dan Bertransformasi',
          content:
            'Bacaan Injil hari ini mengajak kita untuk merenungkan pembaruan budi dan ketulusan hati dalam mengikut Yesus. Dalam kehidupan modern yang serba cepat dan menuntut, sering kali kita tergoda untuk menyesuaikan diri dengan apa yang dianggap wajar oleh dunia. Rasul Paulus mengingatkan kita dalam suratnya kepada jemaat di Roma agar kita memperbarui akal budi kita sehingga dapat mengenali apa yang berkenan di hadapan Allah.',
        });
        setLoading(false);
      }
    }

    loadDevotional();
  }, []);

  const handleAuditAction = async (action: 'approved' | 'revision_required' | 'rejected') => {
    setActionLoading(true);
    setNotification(null);

    try {
      const res = await fetch('/api/devotionals/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devotionalId: devotional.id,
          action,
          notes: auditNotes,
          auditorProfileId: currentUser.id,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setDevotional({ ...devotional, audit_status: action, last_audited_by: currentUser.name });
        setNotification({
          type: 'success',
          message: `Status renungan berhasil diubah menjadi: ${action.toUpperCase()}`,
        });
      } else {
        setNotification({ type: 'error', message: json.error || 'Gagal mengubah status audit' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveContent = async () => {
    setActionLoading(true);
    setNotification(null);

    try {
      const res = await fetch('/api/devotionals/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devotionalId: devotional.id,
          action: 'update_content',
          updatedContent: {
            verse_reference: verseRef,
            verse_text: verseText,
            reflection,
            mind_check: mindCheck,
            take_one_step: takeOneStep,
          },
          auditorProfileId: currentUser.id,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', message: 'Konten renungan berhasil diperbarui & disimpan!' });
      } else {
        setNotification({ type: 'error', message: json.error || 'Gagal menyimpan perubahan' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Memuat data audit renungan...</div>;
  }

  const formattedPreview = `╔═══════☩══♛══☩═══════╗
 ☕ 𝐂𝐎𝐅𝐅𝐄𝐄 𝐁𝐑𝐄𝐀𝐊 𝐖𝐈𝐓𝐇 𝐆𝐎𝐃 ✝️
╚═══════☩══✦══☩═══════╝

📖 𝗩𝗲𝗿𝘀𝗲 𝗼𝗳 𝗧𝗵𝗲 𝗗𝗮𝘆 ⋆⋅☆
${verseRef}
"${verseText.replace(/^"|"$/g, '')}"

💭 𝗧𝗼𝗱𝗮𝘆’ｓ 𝗥𝗲𝗳𝗹𝗲𝗰𝘁𝗶𝗼𝗻 ✧◦°˚°◦♡
${reflection}

🧠 𝗠𝗶𝗻𝗱 𝗖𝗵𝗲𝗰𝗸 +✟+
${mindCheck}

✨ 𝗧𝗮𝗸𝗲 𝗢𝗻𝗲 𝗦𝘁𝗲𝗽 ⋆ ᭝ ᨳଓ ՟
${takeOneStep}

“𝓞𝓷𝓮 𝓿𝓮𝓻𝓼𝓮.
𝓞𝓷𝓮 𝓻𝓮𝓯𝓵𝓮𝓬𝓽𝓲𝓸𝓷.
𝓞𝓷𝓮 𝓼𝓽𝓮𝓹 𝓬𝓵𝓸𝓼𝓮𝓻 𝓽𝓸 𝓗𝓲𝓶.”`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full font-medium inline-flex mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Audit & Review Liturgi (Jendela Audit: 00:00 – 09:45 WIB)</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Devotional Audit Studio</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Periksa kebenaran firman, konteks teologis, dan format pesan sebelum disiarkan ke grup LINE komunitas MP.
          </p>
        </div>

        {/* Current Status Badge */}
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Status Saat Ini</span>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                devotional.audit_status === 'approved'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : devotional.audit_status === 'revision_required'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : devotional.audit_status === 'rejected'
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : 'bg-slate-100 text-slate-800 border border-slate-300'
              }`}
            >
              {devotional.audit_status}
            </span>
          </div>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
      )}

      {/* Side-by-side view: Source article vs Editable Form & WhatsApp/LINE Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (4 cols): Scraped Source from The Katolik */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h3 className="font-semibold text-slate-800 text-sm">Sumber: The Katolik</h3>
            </div>
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-emerald-600 hover:underline flex items-center space-x-1"
            >
              <span>Buka Asli</span>
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[550px] text-xs leading-relaxed text-slate-600">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
              <p className="font-semibold text-slate-800 text-xs mb-1">{source.title}</p>
              <p className="text-[10px] text-slate-400">{source.url}</p>
            </div>
            <p className="text-justify whitespace-pre-wrap">{source.content}</p>
          </div>

          {/* Audit Fallback Guidelines */}
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] bg-amber-50/70 p-3 rounded-lg border border-amber-200/50">
            <p className="font-semibold text-amber-900 flex items-center space-x-1">
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Kebijakan Fallback 09:45 WIB:</span>
            </p>
            <p className="text-amber-800 mt-1">
              Jika belum diaudit hingga pukul 09:45 WIB, sistem dapat mengirim secara otomatis HANYA jika lolos validasi template dan tidak berstatus <strong>Rejected</strong> atau <strong>Revision Required</strong>.
            </p>
          </div>
        </div>

        {/* Middle Column (5 cols): Content Editor */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm">Edit Komponen Renungan</h3>
            <button
              onClick={handleSaveContent}
              disabled={actionLoading}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-all shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Perubahan</span>
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[550px] pr-1">
            {/* Verse Reference */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Verse Reference (Ayat Emas)
              </label>
              <input
                type="text"
                value={verseRef}
                onChange={(e) => setVerseRef(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                placeholder="Contoh: Roma 12:2"
              />
            </div>

            {/* Verse Text */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Verse Text (Isi Firman)
              </label>
              <textarea
                rows={3}
                value={verseText}
                onChange={(e) => setVerseText(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                placeholder="Kutipan ayat firman Tuhan..."
              />
            </div>

            {/* Reflection */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Today's Reflection (Renungan Singkat)
              </label>
              <textarea
                rows={4}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                placeholder="Renungan aplikatif 2-4 kalimat..."
              />
            </div>

            {/* Mind Check */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Mind Check (Pertanyaan Refleksi Pribadi)
              </label>
              <textarea
                rows={2}
                value={mindCheck}
                onChange={(e) => setMindCheck(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                placeholder="Pertanyaan reflektif..."
              />
            </div>

            {/* Take One Step */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Take One Step (Langkah Konkrit Nyata)
              </label>
              <textarea
                rows={2}
                value={takeOneStep}
                onChange={(e) => setTakeOneStep(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                placeholder="Aksi konkrit hari ini..."
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Catatan Audit (Opsional)
              </label>
              <input
                type="text"
                value={auditNotes}
                onChange={(e) => setAuditNotes(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"
                placeholder="Tambahkan catatan revisi jika ada..."
              />
            </div>
          </div>
        </div>

        {/* Right Column (3 cols): LINE Message Preview & Audit Actions */}
        <div className="lg:col-span-3 space-y-4 flex flex-col justify-between">
          {/* Official LINE Preview */}
          <div className="bg-slate-900 rounded-xl p-4 text-white shadow-md border border-slate-800 flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
              <span className="text-[10px] font-mono text-emerald-400">LINE Message Preview</span>
              <span className="text-[10px] text-slate-400">Coffee Break</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg flex-1 overflow-y-auto max-h-[400px] border border-slate-800/80">
              <pre className="text-[10.5px] font-sans whitespace-pre-wrap text-slate-200 leading-relaxed">
                {formattedPreview}
              </pre>
            </div>
          </div>

          {/* Audit Action Buttons */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <span className="text-[11px] font-semibold text-slate-700 block mb-1">
              Aksi Keputusan Audit:
            </span>

            {/* Approve */}
            <button
              onClick={() => handleAuditAction('approved')}
              disabled={actionLoading}
              className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg text-xs transition-colors shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve (Siap Kirim 09:45)</span>
            </button>

            {/* Revision Required */}
            <button
              onClick={() => handleAuditAction('revision_required')}
              disabled={actionLoading}
              className="w-full flex items-center justify-center space-x-2 bg-amber-500 hover:bg-amber-400 text-white font-medium py-2 rounded-lg text-xs transition-colors shadow-sm"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Minta Revisi (Tahan Siaran)</span>
            </button>

            {/* Reject */}
            <button
              onClick={() => handleAuditAction('rejected')}
              disabled={actionLoading}
              className="w-full flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-500 text-white font-medium py-2 rounded-lg text-xs transition-colors shadow-sm"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject (Tolak Renungan)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
