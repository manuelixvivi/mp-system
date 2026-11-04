'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import { Devotional } from '@/types';
import {
  BookOpen,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowRight,
  Eye,
  Send,
  AlertCircle,
} from 'lucide-react';

export default function DevotionalManagementPage() {
  const { currentRole } = useRole();
  const [devotionals, setDevotionals] = useState<Devotional[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<any>(null);

  const loadDevotionals = async () => {
    try {
      const res = await fetch('/api/devotionals');
      const data = await res.json();
      setDevotionals(data.devotionals || []);
    } catch (e) {
      console.error('Failed fetching devotionals:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevotionals();
  }, []);

  const handleManualScrape = async () => {
    setScraping(true);
    setScrapeResult(null);
    try {
      const res = await fetch('/api/cron/devotional-scrape', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setScrapeResult({ success: true, message: data.message || 'Scraping berhasil dieksekusi dan disimpan!' });
      } else {
        setScrapeResult({ success: false, message: data.message || data.error || 'Gagal menjalankan scraping' });
      }
      await loadDevotionals();
    } catch (e: any) {
      setScrapeResult({ success: false, message: e.message || 'Gagal menjalankan scraping' });
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
        <div
          className={`p-4 rounded-xl text-xs border ${
            scrapeResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {scrapeResult.message}
        </div>
      )}

      {/* Devotionals List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          Memuat data renungan harian...
        </div>
      ) : devotionals.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {devotionals.map((dev) => (
            <div
              key={dev.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {dev.devotional_date}
                  </span>
                  <span className="font-semibold text-emerald-700 text-sm">{dev.verse_reference}</span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                      dev.audit_status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : dev.audit_status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {dev.audit_status}
                  </span>
                  {dev.is_fallback_eligible && (
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 font-medium">
                      Fallback Ready
                    </span>
                  )}
                </div>

                {dev.saint_commemoration && (
                  <p className="text-[11px] font-medium text-amber-800">
                    🕊️ Peringatan : {dev.saint_commemoration}
                  </p>
                )}

                <p className="text-xs text-slate-600 line-clamp-2 italic">
                  "{dev.verse_text?.replace(/^"|"$/g, '')}"
                </p>

                <div className="flex items-center space-x-4 text-[11px] text-slate-400">
                  <span>
                    Auditor:{' '}
                    <strong className="text-slate-600">
                      {dev.last_audited_by || 'Belum Diaudit'}
                    </strong>
                  </span>
                  {dev.created_at && (
                    <span>
                      Dibuat: {new Date(dev.created_at).toLocaleDateString('id-ID')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <Link
                  href={`/dashboard/devotionals/audit?date=${dev.devotional_date}`}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Audit / Detail</span>
                </Link>
                {(currentRole === 'superadmin' || currentRole === 'liturgi') && dev.audit_status === 'approved' && (
                  <Link
                    href={`/dashboard/broadcast/manual?module=devotional&id=${dev.id}`}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Siarkan</span>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-xl border border-dashed border-slate-200">
          <div className="p-3 bg-amber-50 rounded-full text-amber-600 w-fit mx-auto mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">Belum Ada Renungan Tersimpan</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
            Tidak ada data renungan harian yang ditemukan di database. Anda dapat menjalankan scraping otomatis sekarang.
          </p>
          {(currentRole === 'superadmin' || currentRole === 'liturgi') && (
            <button
              onClick={handleManualScrape}
              disabled={scraping}
              className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scraping ? 'animate-spin' : ''}`} />
              <span>{scraping ? 'Menjalankan...' : 'Jalankan Scraping Sekarang'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
