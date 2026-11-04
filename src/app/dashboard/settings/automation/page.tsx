'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import { useServerTime } from '@/context/ServerTimeContext';
import { LineGroup, Member } from '@/types';
import {
  Sliders,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Save,
  HelpCircle,
  ShieldAlert,
  Users,
  Gift,
  BookOpen,
  ExternalLink,
  Radio,
  Sparkles,
} from 'lucide-react';

export default function AutomationSettingsPage() {
  const { currentRole } = useRole();
  const { wibTimeStr } = useServerTime();

  const [settings, setSettings] = useState({
    devotional_scraping_time: '00:00',
    devotional_broadcast_time: '09:45',
    birthday_broadcast_time: '07:00',
    devotional_fallback_enabled: true,
    birthday_mention_limit: 20,
    devotional_automation_active: true,
    birthday_automation_active: true,
    groq_api_key: '',
    groq_model: 'llama-3.3-70b-versatile',
    gemini_api_key: '',
  });

  const [loadingSettings, setLoadingSettings] = useState(true);
  const [groups, setGroups] = useState<LineGroup[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);
  const [triggerResult, setTriggerResult] = useState<any>(null);

  const fetchSettings = () => {
    setLoadingSettings(true);
    fetch('/api/settings', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store' },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setSettings(data.settings);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoadingSettings(false));
  };

  useEffect(() => {
    fetchSettings();

    fetch('/api/groups', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.groups) setGroups(data.groups);
      })
      .catch((e) => console.error(e));

    fetch('/api/members', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.members) setMembers(data.members);
      })
      .catch((e) => console.error(e));
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    setSaveError(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store',
        },
        body: JSON.stringify(settings),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        if (data.settings) setSettings(data.settings);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 4000);
      } else {
        setSaveError(data.error || 'Gagal menyimpan pengaturan ke database.');
      }
    } catch (err: any) {
      console.error(err);
      setSaveError(err.message || 'Terjadi kesalahan jaringan saat menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestCronTrigger = async (endpoint: string, label: string) => {
    setTriggeringJob(label);
    setTriggerResult(null);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      setTriggerResult({
        job: label,
        success: res.ok,
        message: data.message || (res.ok ? 'Sukses dieksekusi' : 'Gagal dieksekusi'),
      });
    } catch (err: any) {
      setTriggerResult({
        job: label,
        success: false,
        message: err.message,
      });
    } finally {
      setTriggeringJob(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full font-medium inline-flex mb-2">
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            <span>Sistem & Penjadwalan Otomatisasi (Cron Scheduler)</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Pengaturan Jadwal & Otomatisasi</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Konfigurasi waktu eksekusi harian (WIB), aturan fallback, dan pengujian langsung broadcast bot LINE.
          </p>
        </div>

        <div className="flex flex-col items-end space-y-2">
          {savedSuccess && (
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 font-semibold shadow-sm animate-pulse">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Pengaturan Berhasil Disimpan ke Database!</span>
            </div>
          )}

          {saveError && (
            <div className="bg-rose-50 text-rose-800 border border-rose-200 px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 font-semibold shadow-sm">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>{saveError}</span>
            </div>
          )}

          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-700">
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>Waktu Server: <strong>{wibTimeStr || '--:--:--'} WIB</strong></span>
          </div>
        </div>
      </div>

      {/* Active Scheduler Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-xl flex items-start space-x-3 text-xs text-slate-700 shadow-sm">
        <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-blue-900">
            Active In-App Scheduler Watcher Aktif & Terhubung ke Supabase
          </p>
          <p className="text-slate-600 leading-relaxed">
            Perubahan jam siaran (misal <strong>{settings.birthday_broadcast_time} WIB</strong>) langsung tersimpan ke Supabase.
            Saat halaman Dashboard dibuka di browser, sistem <strong>Active Watcher</strong> secara otomatis memantau jam WIB realtime dan akan memicu broadcast ke grup LINE tepat pada menit yang Anda tentukan.
            Anda juga dapat menggunakan tombol <strong>[Jalankan Manual]</strong> di sebelah kanan kapan saja untuk menguji pengiriman secara instan tanpa perlu menunggu waktu jadwal.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Settings Form */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          {loadingSettings ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
              <Clock className="w-6 h-6 animate-spin text-blue-500" />
              <p className="text-xs">Memuat konfigurasi jadwal dari database...</p>
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-5 text-xs">
              {/* Section 1: Daily Devotional Settings */}
              <div>
                <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100 mb-3 flex items-center justify-between">
                  <span>1. Otomatisasi Daily Devotional (Coffee Break with God)</span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Target: {settings.devotional_broadcast_time} WIB
                  </span>
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                    <div>
                      <p className="font-semibold text-slate-800">Status Automasi Renungan</p>
                      <p className="text-[11px] text-slate-400">Aktifkan atau nonaktifkan scheduler harian renungan.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.devotional_automation_active}
                      onChange={(e) =>
                        setSettings({ ...settings, devotional_automation_active: e.target.checked })
                      }
                      className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Waktu Scraping The Katolik (WIB)
                      </label>
                      <input
                        type="text"
                        value={settings.devotional_scraping_time}
                        onChange={(e) =>
                          setSettings({ ...settings, devotional_scraping_time: e.target.value })
                        }
                        placeholder="00:00"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Waktu Broadcast ke LINE (WIB)
                      </label>
                      <input
                        type="text"
                        value={settings.devotional_broadcast_time}
                        onChange={(e) =>
                          setSettings({ ...settings, devotional_broadcast_time: e.target.value })
                        }
                        placeholder="09:45"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Fallback rule */}
                  <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-amber-900">Fallback Otomatis pada 09:45 WIB</p>
                        <p className="text-[11px] text-amber-800/80 mt-0.5">
                          Kirim otomatis jika Liturgi belum mengaudit dan konten lolos validasi template resmi.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.devotional_fallback_enabled}
                        onChange={(e) =>
                          setSettings({ ...settings, devotional_fallback_enabled: e.target.checked })
                        }
                        className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Target Groups Info */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700 flex items-center space-x-1">
                        <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                        <span>Grup Target Siaran Renungan:</span>
                      </span>
                      <Link
                        href="/dashboard/groups"
                        className="text-[11px] text-blue-600 hover:underline flex items-center space-x-0.5 font-medium"
                      >
                        <span>Kelola Grup</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    </div>
                    <div className="mt-1 text-[11px]">
                      {groups.filter((g) => g.is_active && g.assigned_modules.includes('devotional')).length > 0 ? (
                        <span className="text-emerald-700 font-semibold">
                          {groups
                            .filter((g) => g.is_active && g.assigned_modules.includes('devotional'))
                            .map((g) => g.group_name)
                            .join(', ')}
                        </span>
                      ) : (
                        <span className="text-red-600 font-medium">Belum ada grup aktif yang ditugaskan modul Renungan.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Birthday Settings */}
              <div>
                <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100 mb-3 flex items-center justify-between">
                  <span>2. Otomatisasi Birthday Automation</span>
                  <span className="text-[11px] font-mono text-blue-600 font-semibold">
                    Target: {settings.birthday_broadcast_time} WIB
                  </span>
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                    <div>
                      <p className="font-semibold text-slate-800">Status Automasi Ulang Tahun</p>
                      <p className="text-[11px] text-slate-400">Kirim otomatis tanpa persetujuan manual.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.birthday_automation_active}
                      onChange={(e) =>
                        setSettings({ ...settings, birthday_automation_active: e.target.checked })
                      }
                      className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Waktu Siaran Otomatis (WIB)
                      </label>
                      <input
                        type="text"
                        value={settings.birthday_broadcast_time}
                        onChange={(e) =>
                          setSettings({ ...settings, birthday_broadcast_time: e.target.value })
                        }
                        placeholder="07:00"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Format HH:mm (24 Jam WIB). Contoh: 07:00, 13:18
                      </p>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Maksimal Mention per Pesan
                      </label>
                      <input
                        type="number"
                        value={settings.birthday_mention_limit}
                        onChange={(e) =>
                          setSettings({ ...settings, birthday_mention_limit: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Pesan di-split ke batch jika melebihi batas.
                      </p>
                    </div>
                  </div>

                  {/* Connected Birthday Database & Target Groups Status */}
                  <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-900 flex items-center space-x-1.5">
                        <Gift className="w-4 h-4 text-blue-600" />
                        <span>Koneksi Database Ulang Tahun & Grup LINE</span>
                      </span>
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Database Terhubung</span>
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-700 flex items-start justify-between">
                      <div>
                        <span className="text-slate-500">Grup LINE Penerima Ucapan: </span>
                        {groups.filter((g) => g.is_active && g.assigned_modules.includes('birthday')).length > 0 ? (
                          <strong className="text-slate-800">
                            {groups
                              .filter((g) => g.is_active && g.assigned_modules.includes('birthday'))
                              .map((g) => g.group_name)
                              .join(', ')}
                          </strong>
                        ) : (
                          <span className="text-amber-700 font-medium">Belum ada grup aktif yang ditugaskan modul Ulang Tahun.</span>
                        )}
                      </div>
                      <Link
                        href="/dashboard/groups"
                        className="text-blue-600 hover:underline font-semibold flex items-center space-x-0.5 flex-shrink-0 ml-2"
                      >
                        <span>Atur Grup</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    </div>

                    {/* Today's Birthday Member Status */}
                    <div className="text-[11px] text-slate-700 flex items-start justify-between pt-2 border-t border-blue-100">
                      <div>
                        <span className="text-slate-500">Anggota Ulang Tahun Hari Ini: </span>
                        {members.filter(
                          (m) =>
                            m.status === 'active' &&
                            m.birth_date === new Date().getDate() &&
                            m.birth_month === new Date().getMonth() + 1
                        ).length > 0 ? (
                          <strong className="text-emerald-700">
                            {
                              members.filter(
                                (m) =>
                                  m.status === 'active' &&
                                  m.birth_date === new Date().getDate() &&
                                  m.birth_month === new Date().getMonth() + 1
                              ).length
                            }{' '}
                            Orang (
                            {members
                              .filter(
                                (m) =>
                                  m.status === 'active' &&
                                  m.birth_date === new Date().getDate() &&
                                  m.birth_month === new Date().getMonth() + 1
                              )
                              .map((m) => m.full_name)
                              .join(', ')}
                            )
                          </strong>
                        ) : (
                          <span className="text-slate-500">Tidak ada anggota berulang tahun hari ini.</span>
                        )}
                      </div>
                      <Link
                        href="/dashboard/birthdays"
                        className="text-blue-600 hover:underline font-semibold flex items-center space-x-0.5 flex-shrink-0 ml-2"
                      >
                        <span>Lihat Data</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {currentRole === 'superadmin' && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={fetchSettings}
                    className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Muat Ulang dari Database
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
                  </button>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Right Column (5 cols): Manual Trigger Test Center */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>Cron Job Test Runner</span>
                <span className="text-[10px] font-normal bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  Uji Coba Langsung
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Jalankan trigger cron secara langsung tanpa menunggu waktu scheduler sebenarnya untuk keperluan verifikasi.
              </p>
            </div>

            <div className="space-y-3 mt-4 text-xs">
              {/* Trigger Scraping */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">
                    Scraping The Katolik ({settings.devotional_scraping_time || '00:00'})
                  </p>
                  <p className="text-[11px] text-slate-400">Endpoint: /api/cron/devotional-scrape</p>
                </div>
                <button
                  onClick={() => handleTestCronTrigger('/api/cron/devotional-scrape', 'Scraping Renungan')}
                  disabled={triggeringJob !== null}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg font-medium text-[11px] transition-colors cursor-pointer"
                >
                  {triggeringJob === 'Scraping Renungan' ? 'Memproses...' : 'Jalankan'}
                </button>
              </div>

              {/* Trigger Devotional Broadcast */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">
                    Devotional Broadcast ({settings.devotional_broadcast_time || '09:45'})
                  </p>
                  <p className="text-[11px] text-slate-400">Endpoint: /api/cron/devotional-broadcast</p>
                </div>
                <button
                  onClick={() => handleTestCronTrigger('/api/cron/devotional-broadcast', 'Devotional Broadcast')}
                  disabled={triggeringJob !== null}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-medium text-[11px] transition-colors cursor-pointer"
                >
                  {triggeringJob === 'Devotional Broadcast' ? 'Memproses...' : 'Jalankan'}
                </button>
              </div>

              {/* Trigger Birthday Broadcast */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800 flex items-center space-x-1">
                    <span>Birthday Broadcast</span>
                    <span className="text-blue-700 bg-blue-100 font-mono px-1.5 py-0.2 rounded text-[10px]">
                      ({settings.birthday_broadcast_time || '07:00'})
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400">Endpoint: /api/cron/birthday-broadcast</p>
                </div>
                <button
                  onClick={() => handleTestCronTrigger('/api/cron/birthday-broadcast', 'Birthday Broadcast')}
                  disabled={triggeringJob !== null}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium text-[11px] transition-colors cursor-pointer"
                >
                  {triggeringJob === 'Birthday Broadcast' ? 'Memproses...' : 'Jalankan Manual'}
                </button>
              </div>
            </div>

            {triggerResult && (
              <div
                className={`mt-4 p-3.5 rounded-xl border text-xs ${
                  triggerResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <p className="font-semibold">Hasil Eksekusi: {triggerResult.job}</p>
                <p className="text-[11px] mt-0.5">{triggerResult.message}</p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 space-y-1">
            <p>
              Zona Waktu: <strong>Asia/Jakarta (WIB)</strong>.
            </p>
            <p className="text-[10px] text-slate-400 leading-normal">
              Tombol <strong>[Jalankan Manual]</strong> di atas mengirim pesan siaran ke LINE saat ini juga tanpa perlu menunggu jam jadwal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
