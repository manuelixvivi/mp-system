'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useServerTime } from '@/context/ServerTimeContext';
import { useRole } from '@/context/RoleContext';
import { Devotional } from '@/types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Radio,
  ArrowRight,
  Sparkles,
  Share2,
} from 'lucide-react';

const MONTH_NAMES = [
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

export default function DevotionalCalendarPage() {
  const { currentRole } = useRole();
  const { wibDay, wibMonth, wibYear, isSynced, serverTime } = useServerTime();

  const [currentMonth, setCurrentMonth] = useState<number>(wibMonth || 11);
  const [currentYear, setCurrentYear] = useState<number>(wibYear || 2026);
  const [selectedDay, setSelectedDay] = useState<number>(wibDay || 4);

  const [devotionals, setDevotionals] = useState<Devotional[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrapingMulti, setScrapingMulti] = useState(false);
  const [singleScraping, setSingleScraping] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (isSynced && !hasInitializedRef.current) {
      setCurrentMonth(wibMonth);
      setCurrentYear(wibYear);
      setSelectedDay(wibDay);
      hasInitializedRef.current = true;
    }
  }, [isSynced, wibMonth, wibYear, wibDay]);

  const fetchDevotionals = async () => {
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
    fetchDevotionals();
  }, []);

  // Multi-day scrape trigger
  const handleMultiDayScrape = async () => {
    setScrapingMulti(true);
    setNotification(null);
    try {
      const res = await fetch('/api/cron/devotional-scrape?mode=multiday', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setNotification({
          type: 'success',
          message: data.message || 'Multi-day scraping berhasil dijalankan!',
        });
      } else {
        setNotification({
          type: 'info',
          message: data.message || data.error || 'Informasi status scraping',
        });
      }
      await fetchDevotionals();
    } catch (e: any) {
      setNotification({ type: 'error', message: e.message || 'Gagal menjalankan multi-day scraping' });
    } finally {
      setScrapingMulti(false);
    }
  };

  // Single date scrape trigger
  const handleSingleDateScrape = async (dateStr: string) => {
    setSingleScraping(true);
    setNotification(null);
    try {
      const res = await fetch(`/api/cron/devotional-scrape?date=${dateStr}&mode=single&force=true`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: `Scraping renungan tanggal ${dateStr} berhasil!` });
        await fetchDevotionals();
      } else {
        setNotification({ type: 'error', message: data.message || data.error || 'Gagal menjalankan scraping' });
      }
    } catch (e: any) {
      setNotification({ type: 'error', message: e.message || 'Terjadi kesalahan sistem' });
    } finally {
      setSingleScraping(false);
    }
  };

  // Calendar calculations
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 is Sunday

  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Map devotionals by date string YYYY-MM-DD
  const devotionalMap = new Map<string, Devotional>();
  devotionals.forEach((d) => {
    if (d.devotional_date) {
      devotionalMap.set(d.devotional_date, d);
    }
  });

  // Selected date ISO string
  const selectedDateIso = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const selectedDevotional = devotionalMap.get(selectedDateIso);

  // Today ISO
  const todayIso = `${wibYear}-${String(wibMonth).padStart(2, '0')}-${String(wibDay).padStart(2, '0')}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full font-medium inline-flex mb-2">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Kalender Konten • Coffee Break with God</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Kalender Renungan Harian Katolik</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pantau ketersediaan renungan beberapa hari ke depan hasil multi-day scraping portal The Katolik.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {(currentRole === 'superadmin' || currentRole === 'liturgi') && (
            <button
              onClick={handleMultiDayScrape}
              disabled={scrapingMulti}
              className="inline-flex items-center space-x-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scrapingMulti ? 'animate-spin' : ''}`} />
              <span>{scrapingMulti ? 'Sedang Scraping...' : 'Tarik Renungan Multi-Day'}</span>
            </button>
          )}
          <Link
            href="/dashboard/devotionals"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            Daftar Tabel
          </Link>
          <Link
            href="/dashboard/devotionals/audit"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <span>Audit Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs border flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : notification.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-2">
            &times;
          </button>
        </div>
      )}

      {/* Main Grid: Calendar Grid (7 cols) + Selected Day Preview (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar View (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          {/* Calendar Month Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-800">
              {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </h2>
            <div className="flex items-center space-x-1">
              <button
                onClick={prevMonth}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setCurrentMonth(wibMonth || 11);
                  setCurrentYear(wibYear || 2026);
                  setSelectedDay(wibDay || 4);
                }}
                className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
              >
                Hari Ini
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 pb-1">
            <span className="text-rose-500">Min</span>
            <span>Sen</span>
            <span>Sel</span>
            <span>Rab</span>
            <span>Kam</span>
            <span>Jum</span>
            <span>Sab</span>
          </div>

          {/* Calendar Cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Blank offset days */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} className="h-20 bg-slate-50/50 rounded-lg border border-transparent" />
            ))}

            {/* Days in current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const cellDateIso = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const cellDevotional = devotionalMap.get(cellDateIso);
              const isToday = cellDateIso === todayIso;
              const isSelected = selectedDay === dayNum;

              return (
                <button
                  key={`day-${dayNum}`}
                  onClick={() => setSelectedDay(dayNum)}
                  className={`h-20 p-1.5 rounded-lg border text-left flex flex-col justify-between transition-all relative ${
                    isSelected
                      ? 'border-emerald-600 ring-2 ring-emerald-500/30 bg-emerald-50/40 z-10'
                      : isToday
                      ? 'border-amber-400 bg-amber-50/30'
                      : cellDevotional
                      ? 'border-slate-200 hover:border-slate-300 bg-white'
                      : 'border-dashed border-slate-200/80 hover:bg-slate-50/80 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-bold ${
                        isSelected
                          ? 'text-emerald-800'
                          : isToday
                          ? 'text-amber-800 bg-amber-200/70 px-1.5 py-0.5 rounded-md text-[11px]'
                          : 'text-slate-700'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {cellDevotional?.saint_commemoration && (
                      <span className="text-xs" title={`Peringatan: ${cellDevotional.saint_commemoration}`}>
                        🕊️
                      </span>
                    )}
                  </div>

                  {cellDevotional ? (
                    <div className="w-full">
                      <p className="text-[10px] font-semibold text-slate-800 truncate" title={cellDevotional.verse_reference}>
                        {cellDevotional.verse_reference}
                      </p>
                      <div className="flex items-center space-x-1 mt-0.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            cellDevotional.audit_status === 'approved'
                              ? 'bg-emerald-500'
                              : cellDevotional.audit_status === 'pending'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        />
                        <span
                          className={`text-[9px] font-semibold uppercase ${
                            cellDevotional.audit_status === 'approved'
                              ? 'text-emerald-700'
                              : cellDevotional.audit_status === 'pending'
                              ? 'text-amber-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {cellDevotional.audit_status}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[9px] text-slate-300 italic">Belum ada</div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Approved (Siap Kirim)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Pending (Perlu Audit)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Revisi / Ditolak</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span>🕊️</span>
              <span>Peringatan Santo/Santa</span>
            </div>
          </div>
        </div>

        {/* Selected Date Detail Drawer (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            {/* Header of detail card */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Detail Renungan Terpilih
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedDay} {MONTH_NAMES[currentMonth - 1]} {currentYear}
                </h3>
              </div>

              {selectedDevotional ? (
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase ${
                    selectedDevotional.audit_status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedDevotional.audit_status === 'pending'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {selectedDevotional.audit_status}
                </span>
              ) : (
                <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  Kosong
                </span>
              )}
            </div>

            {/* Content preview */}
            {selectedDevotional ? (
              <div className="mt-4 space-y-3.5 text-xs">
                {selectedDevotional.saint_commemoration && (
                  <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 text-amber-900 font-medium flex items-center space-x-2">
                    <span className="text-base">🕊️</span>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider block text-amber-700">
                        Peringatan Hari Ini
                      </span>
                      <span>{selectedDevotional.saint_commemoration}</span>
                    </div>
                  </div>
                )}

                {/* Verse of The Day */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-0.5">
                    📖 Verse of The Day
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{selectedDevotional.verse_reference}</p>
                  <p className="text-slate-600 italic mt-1 leading-relaxed">
                    "{selectedDevotional.verse_text.replace(/^"|"$/g, '')}"
                  </p>
                </div>

                {/* Reflection */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-700 block mb-1">💭 Today's Reflection</span>
                  <p className="text-slate-600 leading-relaxed text-[11px]">{selectedDevotional.reflection}</p>
                </div>

                {/* Mind Check & Take One Step */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="font-bold text-slate-700 block mb-0.5">🧠 Mind Check</span>
                    <p className="text-slate-500 leading-relaxed">{selectedDevotional.mind_check}</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="font-bold text-slate-700 block mb-0.5">✨ Take One Step</span>
                    <p className="text-slate-500 leading-relaxed">{selectedDevotional.take_one_step}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-3">
                <div className="p-3 bg-slate-100 rounded-full text-slate-400 w-fit mx-auto">
                  <BookOpen className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Belum ada konten renungan harian untuk tanggal {selectedDateIso} di database.
                </p>
                {(currentRole === 'superadmin' || currentRole === 'liturgi') && (
                  <button
                    onClick={() => handleSingleDateScrape(selectedDateIso)}
                    disabled={singleScraping}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${singleScraping ? 'animate-spin' : ''}`} />
                    <span>{singleScraping ? 'Sedang Scraping...' : 'Scrape untuk Tanggal Ini'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Action buttons at bottom */}
          {selectedDevotional && (
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              <Link
                href={`/dashboard/devotionals/audit?date=${selectedDateIso}`}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Buka di Audit Studio</span>
              </Link>

              <Link
                href={`/dashboard/broadcast/manual`}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Manual Broadcast</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
