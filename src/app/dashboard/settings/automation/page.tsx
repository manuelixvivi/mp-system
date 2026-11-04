'use client';

import React, { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import {
  Sliders,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Save,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';

export default function AutomationSettingsPage() {
  const { currentRole } = useRole();
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

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);
  const [triggerResult, setTriggerResult] = useState<any>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) setSettings(data.settings);
      })
      .catch((e) => console.error(e));
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleTestCronTrigger = async (endpoint: string, label: string) => {
    setTriggeringJob(label);
    setTriggerResult(null);

    try {
      const res = await fetch(endpoint, { method: 'POST' });
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
            <Sliders className="w-3.5 h-3.5" />
            <span>Sistem & Penjadwalan Otomatisasi (Cron Scheduler)</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Pengaturan Jadwal & Otomatisasi</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Konfigurasi waktu eksekusi harian (WIB), aturan fallback 09:45, dan pengujian manual antrean cron job.
          </p>
        </div>

        {savedSuccess && (
          <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Pengaturan Berhasil Disimpan!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Settings Form */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <form onSubmit={handleSaveSettings} className="space-y-5 text-xs">
            {/* Section 1: Daily Devotional Settings */}
            <div>
              <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100 mb-3">
                1. Otomatisasi Daily Devotional (Coffee Break with God)
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
                    className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
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
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
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
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
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
                      className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Birthday Settings */}
            <div>
              <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100 mb-3">
                2. Otomatisasi Birthday Automation
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
                    className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
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
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
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
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {currentRole === 'superadmin' && (
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Right Column (5 cols): Manual Trigger Test Center */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Cron Job Test Runner</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Jalankan trigger cron secara langsung tanpa menunggu waktu scheduler sebenarnya untuk keperluan verifikasi.
              </p>
            </div>

            <div className="space-y-3 mt-4 text-xs">
              {/* Trigger Scraping */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">Scraping The Katolik (00:00)</p>
                  <p className="text-[11px] text-slate-400">Endpoint: /api/cron/devotional-scrape</p>
                </div>
                <button
                  onClick={() => handleTestCronTrigger('/api/cron/devotional-scrape', 'Scraping Renungan')}
                  disabled={triggeringJob !== null}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-[11px] transition-colors"
                >
                  Jalankan
                </button>
              </div>

              {/* Trigger Devotional Broadcast */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">Devotional Broadcast (09:45)</p>
                  <p className="text-[11px] text-slate-400">Endpoint: /api/cron/devotional-broadcast</p>
                </div>
                <button
                  onClick={() => handleTestCronTrigger('/api/cron/devotional-broadcast', 'Devotional Broadcast')}
                  disabled={triggeringJob !== null}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-[11px] transition-colors"
                >
                  Jalankan
                </button>
              </div>

              {/* Trigger Birthday Broadcast */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">Birthday Broadcast (07:00)</p>
                  <p className="text-[11px] text-slate-400">Endpoint: /api/cron/birthday-broadcast</p>
                </div>
                <button
                  onClick={() => handleTestCronTrigger('/api/cron/birthday-broadcast', 'Birthday Broadcast')}
                  disabled={triggeringJob !== null}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-[11px] transition-colors"
                >
                  Jalankan
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

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Zona Waktu: <strong>Asia/Jakarta (WIB)</strong>. Semua cron job berjalan di backend independen dari browser pengguna.
          </div>
        </div>
      </div>
    </div>
  );
}
