'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import {
  BookOpen,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowRight,
  Eye,
  Send,
} from 'lucide-react';

export default function DevotionalManagementPage() {
  const { currentRole } = useRole();
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<any>(null);

  const devotionals = [
    {
      id: '99999999-9999-9999-9999-999999999901',
      date: '2026-10-30',
      verseRef: 'Roma 12:2',
      verseText:
        'Janganlah kamu menjadi serupa dengan dunia ini, tetapi berubahlah oleh pembaruan budimu, sehingga kamu dapat membedakan manakah kehendak Allah: apa yang baik, yang berkenan kepada Allah dan yang sempurna.',
      reflection:
        'Dalam kesibukan harian kita yang sering kali bising dan dipenuhi oleh standar duniawi, Tuhan mengundang kita untuk berhenti sejenak. Memperbarui budi berarti mengarahkan pandangan kita kembali kepada Kristus...',
      status: 'approved',
      auditor: 'Sr. Clara Bernadeth',
      fallbackEligible: true,
    },
    {
      id: '99999999-9999-9999-9999-999999999902',
      date: '2026-10-29',
      verseRef: 'Filipi 4:13',
      verseText: 'Segala perkara dapat kutanggung di dalam Dia yang memberi kekuatan kepadaku.',
      reflection:
        'Kekuatan kita yang sejati tidak bersumber pada kemampuan diri sendiri atau kekayaan lahiriah, melainkan pada penyertaan Roh Kudus yang senantiasa menopang...',
      status: 'approved',
      auditor: 'Fr. Michael Tan',
      fallbackEligible: true,
    },
    {
      id: '99999999-9999-9999-9999-999999999903',
      date: '2026-10-28',
      verseRef: 'Amsal 3:5-6',
      verseText:
        'Percayalah kepada TUHAN dengan segenap hatimu, dan janganlah bersandar kepada pengertianmu sendiri. Akuilah Dia dalam segala lakumu, maka Ia akan meluruskan jalanmu.',
      reflection:
        'Menyerahkan kendali hidup kepada Allah sering kali membutuhkan kerendahan hati yang mendalam...',
      status: 'approved',
      auditor: 'Sr. Clara Bernadeth',
      fallbackEligible: true,
    },
  ];

  const handleManualScrape = async () => {
    setScraping(true);
    setScrapeResult(null);
    try {
      const res = await fetch('/api/cron/devotional-scrape', { method: 'POST' });
      const data = await res.json();
      setScrapeResult({ success: true, message: data.message || 'Scraping berhasil dieksekusi!' });
    } catch (e: any) {
      setScrapeResult({ success: false, message: e.message });
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full font-medium inline-flex mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Coffee Break with God • Otomatisasi Renungan Harian</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Manajemen Konten Renungan</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar seluruh renungan yang telah discrape dari The Katolik dan diformat oleh LLM Gemini.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {(currentRole === 'superadmin' || currentRole === 'liturgi') && (
            <button
              onClick={handleManualScrape}
              disabled={scraping}
              className="inline-flex items-center space-x-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scraping ? 'animate-spin' : ''}`} />
              <span>{scraping ? 'Menjalankan Scraping...' : 'Jalankan Scraping Sekarang'}</span>
            </button>
          )}
          <Link
            href="/dashboard/devotionals/audit"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <span>Buka Audit Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {scrapeResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
          {scrapeResult.message}
        </div>
      )}

      {/* Devotionals List */}
      <div className="grid grid-cols-1 gap-4">
        {devotionals.map((dev) => (
          <div
            key={dev.id}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex-1 space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {dev.date}
                </span>
                <span className="font-semibold text-emerald-700 text-sm">{dev.verseRef}</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full uppercase">
                  {dev.status}
                </span>
              </div>
              <p className="text-xs text-slate-700 italic">"{dev.verseText}"</p>
              <p className="text-xs text-slate-500 line-clamp-2">{dev.reflection}</p>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0">
              <Link
                href="/dashboard/devotionals/audit"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
              >
                Detail & Audit
              </Link>
              {(currentRole === 'superadmin' || currentRole === 'liturgi') && (
                <Link
                  href="/dashboard/broadcast/manual?module=devotional"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center space-x-1"
                >
                  <Send className="w-3 h-3" />
                  <span>Siarkan</span>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
