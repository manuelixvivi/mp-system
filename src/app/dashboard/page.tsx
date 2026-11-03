'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import { Member, LineGroup, Devotional, AutomationSettings, BroadcastDelivery } from '@/types';
import {
  BookOpen,
  Gift,
  CheckCircle2,
  Clock,
  Radio,
  Sparkles,
  Bot,
  Send,
} from 'lucide-react';

const MONTH_NAMES = [
  '',
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

interface OverviewState {
  groups: LineGroup[];
  members: Member[];
  birthdayToday: Member[];
  deliveries: BroadcastDelivery[];
  todayDevotional: Devotional | null;
  settings: AutomationSettings | null;
}

export default function OverviewPage() {
  const { currentRole, currentUser } = useRole();
  const [data, setData] = useState<OverviewState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const today = new Date();
        const todayDate = today.getDate();
        const todayMonth = today.getMonth() + 1;
        const todayIso = today.toISOString().split('T')[0];

        const [groupsRes, membersRes, deliveriesRes, settingsRes, devotionalRes] = await Promise.all([
          fetch('/api/groups').then((r) => r.json()).catch(() => ({ groups: [] })),
          fetch('/api/members').then((r) => r.json()).catch(() => ({ members: [] })),
          fetch('/api/broadcast/history').then((r) => r.json()).catch(() => ({ deliveries: [] })),
          fetch('/api/settings').then((r) => r.json()).catch(() => ({ settings: null })),
          fetch(`/api/devotionals?date=${todayIso}`).then((r) => r.json()).catch(() => ({ devotional: null })),
        ]);

        const rawMembers: Member[] = membersRes.members || [];
        const bdayMembers = rawMembers.filter(
          (m: Member) =>
            m.status === 'active' &&
            Number(m.birth_date) === todayDate &&
            Number(m.birth_month) === todayMonth
        );

        setData({
          groups: groupsRes.groups || [],
          members: rawMembers,
          birthdayToday: bdayMembers,
          deliveries: deliveriesRes.deliveries || [],
          todayDevotional: devotionalRes.devotional || null,
          settings: settingsRes.settings || null,
        });
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  const today = new Date();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth() + 1;
  const todayIso = today.toISOString().split('T')[0];

  const groups = data?.groups || [];
  const birthdayToday = data?.birthdayToday || [];
  const deliveries = data?.deliveries || [];
  const todayDevotional = data?.todayDevotional || null;
  const settings = data?.settings || null;

  // Delivery performance calculation
  const successDeliveries = deliveries.filter((d) => d.status === 'success');
  const failedDeliveries = deliveries.filter((d) => d.status === 'failed');
  const successRate = deliveries.length > 0 ? Math.round((successDeliveries.length / deliveries.length) * 100) : 100;

  // Check today delivery status
  const todayDeliveries = deliveries.filter((d) => d.delivered_at && d.delivered_at.startsWith(todayIso));
  const bdayDeliveredToday = todayDeliveries.some((d) => d.module === 'birthday' && d.status === 'success');
  const devotionalDeliveredToday = todayDeliveries.some((d) => d.module === 'devotional' && d.status === 'success');

  // Devotional status badges
  const devStatusTitle = todayDevotional
    ? todayDevotional.audit_status === 'approved'
      ? 'Approved'
      : todayDevotional.audit_status === 'revision_required'
      ? 'Revisi'
      : todayDevotional.audit_status === 'rejected'
      ? 'Ditolak'
      : 'Pending'
    : 'Belum Ada';

  const devBadgeText = todayDevotional
    ? devotionalDeliveredToday
      ? 'Terkirim'
      : todayDevotional.audit_status === 'approved'
      ? 'Siap Kirim'
      : todayDevotional.audit_status === 'pending'
      ? 'Menunggu Audit'
      : 'Tahan Siaran'
    : 'Menunggu Scrape';

  const devBadgeClass = todayDevotional
    ? todayDevotional.audit_status === 'approved'
      ? 'bg-emerald-100 text-emerald-800'
      : todayDevotional.audit_status === 'pending'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-rose-100 text-rose-800'
    : 'bg-slate-100 text-slate-600';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-3">
        <div className="w-9 h-9 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-medium">Memuat data dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full text-xs font-medium mb-3 border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>MP Control System v1.0 • Pusat Kendali Terpadu</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Selamat Datang, {currentUser.name}
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Sistem otomatisasi komunikasi komunitas MP. Mengelola Daily Devotional (Coffee Break with God) dan Birthday Automation dengan LINE mention asli.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/broadcast/manual"
              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
            >
              <Radio className="w-4 h-4" />
              <span>Manual Broadcast</span>
            </Link>
            <Link
              href="/dashboard/line-bots"
              className="inline-flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-white/15 backdrop-blur-sm transition-all"
            >
              <Bot className="w-4 h-4" />
              <span>Manajemen LINE Bot</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Primary Status Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* LINE Bot Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">LINE Bot Official</span>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div className="mt-3">
            <p className="text-xl font-bold text-slate-900">
              {groups.length > 0 ? 'Connected' : 'Siap Terhubung'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {groups.length} Grup Terdaftar (Broadcast-Only)
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Jalur: Web + LINE Chat</span>
            <Link href="/dashboard/groups" className="text-emerald-600 hover:text-emerald-700 font-medium">
              Detail &rarr;
            </Link>
          </div>
        </div>

        {/* Daily Devotional Automation Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Coffee Break with God</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-slate-900">{devStatusTitle}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${devBadgeClass}`}>
                {devBadgeText}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Jadwal Siaran: {settings?.devotional_broadcast_time || '09:45'} WIB
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Fallback: {settings?.devotional_fallback_enabled ? 'Aktif' : 'Non-aktif'}
            </span>
            <Link href="/dashboard/devotionals/audit" className="text-emerald-600 hover:text-emerald-700 font-medium">
              Buka Audit &rarr;
            </Link>
          </div>
        </div>

        {/* Birthday Automation Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Birthday Automation</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl font-bold text-slate-900">{birthdayToday.length} Ulang Tahun</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Jadwal Otomatis: {settings?.birthday_broadcast_time || '07:00'} WIB
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className={birthdayToday.length > 0 ? (bdayDeliveredToday ? 'text-emerald-600 font-medium' : 'text-blue-600 font-medium') : 'text-slate-400'}>
              {birthdayToday.length > 0 ? (bdayDeliveredToday ? 'Terkirim Hari Ini' : 'Menunggu Siaran') : 'Tidak Ada Hari Ini'}
            </span>
            <Link href="/dashboard/birthdays" className="text-emerald-600 hover:text-emerald-700 font-medium">
              Lihat Anggota &rarr;
            </Link>
          </div>
        </div>

        {/* Deliveries Success Rate */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Performa Siaran</span>
            <div className="p-1.5 bg-green-50 text-green-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl font-bold text-slate-900">{successRate}% Sukses</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {deliveries.length > 0
                ? `${failedDeliveries.length} Gagal • Idempotent Protection`
                : '0 Terkirim • Belum Ada Riwayat'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              {deliveries.length} Riwayat Terarsip
            </span>
            <Link href="/dashboard/broadcast/history" className="text-emerald-600 hover:text-emerald-700 font-medium">
              Riwayat &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Split: Devotional Card + Birthday Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Today's Devotional & Audit Status */}
        {todayDevotional ? (
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-lg font-bold text-xs">
                    ☕ COFFEE BREAK
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-800 text-base">Renungan Harian Hari Ini</h2>
                    <p className="text-xs text-slate-400">Sumber: The Katolik • Diolah LLM Gemini</p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                    todayDevotional.audit_status === 'approved'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : todayDevotional.audit_status === 'pending'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  Audit: {todayDevotional.audit_status.toUpperCase()}{' '}
                  {todayDevotional.audit_status === 'approved'
                    ? '✅'
                    : todayDevotional.audit_status === 'pending'
                    ? '⏳'
                    : '⚠️'}
                </span>
              </div>

              <div className="mt-4 space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1">
                    📖 Verse of The Day
                  </span>
                  <p className="text-sm font-semibold text-slate-900">{todayDevotional.verse_reference}</p>
                  <p className="text-xs text-slate-600 italic mt-1 leading-relaxed">
                    "{todayDevotional.verse_text.replace(/^"|"$/g, '')}"
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="font-semibold text-slate-700 block mb-1">🧠 Mind Check</span>
                    <p className="text-slate-500 leading-relaxed text-[11px]">
                      {todayDevotional.mind_check || 'Refleksikan firman Tuhan hari ini dalam langkah kehidupanmu.'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="font-semibold text-slate-700 block mb-1">✨ Take One Step</span>
                    <p className="text-slate-500 leading-relaxed text-[11px]">
                      {todayDevotional.take_one_step || 'Ambil satu tindakan nyata untuk mewujudkan kasih Tuhan hari ini.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Auditor: <strong className="text-slate-700">{todayDevotional.last_audited_by || 'Belum diaudit'}</strong>
              </span>
              <div className="flex items-center space-x-2">
                <Link
                  href="/dashboard/devotionals/audit"
                  className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                >
                  Buka Audit Studio
                </Link>
                {(currentRole === 'superadmin' || currentRole === 'liturgi') && todayDevotional.audit_status === 'approved' && (
                  <Link
                    href="/dashboard/broadcast/manual?module=devotional"
                    className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center space-x-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Siarkan Sekarang</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-lg font-bold text-xs">
                    ☕ COFFEE BREAK
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-800 text-base">Renungan Harian Hari Ini</h2>
                    <p className="text-xs text-slate-400">Sumber: The Katolik • Diolah LLM Gemini</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Belum Tersedia
                </span>
              </div>

              <div className="my-8 text-center flex flex-col items-center justify-center p-6 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                <div className="p-3 bg-amber-50 rounded-full text-amber-600 mb-3">
                  <BookOpen className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800">Belum Ada Renungan untuk Hari Ini</p>
                <p className="text-xs text-slate-500 max-w-md mt-1 leading-relaxed">
                  Renungan harian belum discrape atau dibuat untuk hari ini ({todayDate} {MONTH_NAMES[todayMonth]}). Sistem akan otomatis melakukan scraping setiap pukul {settings?.devotional_scraping_time || '00:00'} WIB, atau Anda dapat membukanya di Audit Studio.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Jadwal Siaran: {settings?.devotional_broadcast_time || '09:45'} WIB
              </span>
              <Link
                href="/dashboard/devotionals/audit"
                className="px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Buka Audit Studio</span>
              </Link>
            </div>
          </div>
        )}

        {/* Right Column (5 cols): Today's Birthdays & Batching Info */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Gift className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-slate-800 text-base">Ulang Tahun Hari Ini</h2>
              </div>
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                Pukul {settings?.birthday_broadcast_time || '07:00'} WIB
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-3 mb-4 leading-relaxed">
              Ucapan dikirimkan otomatis menggunakan LINE mention asli ke masing-masing grup dengan kutipan Lamentations 3:22-23 (Tanpa boneka 🧸).
            </p>

            {birthdayToday.length > 0 ? (
              <div className="space-y-2.5 font-mono max-h-[380px] overflow-y-auto pr-1">
                {birthdayToday.map((member, idx) => {
                  const callsignNum = String(idx + 1).padStart(2, '0');
                  const primaryGroupId = member.assigned_groups && member.assigned_groups.length > 0 ? member.assigned_groups[0] : null;
                  const targetGroup = primaryGroupId ? groups.find((g) => g.id === primaryGroupId) : null;
                  const destName = targetGroup ? targetGroup.group_name : 'SEMUA GRUP';
                  return (
                    <div
                      key={member.id}
                      className="p-2.5 bg-slate-50 border border-slate-200/90 rounded-lg border-l-4 border-l-emerald-500 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-bold">
                          <span>CALLSIGN // MP-{callsignNum}</span>
                          <span className="text-slate-300">•</span>
                          <span>DEST: {destName.toUpperCase()}</span>
                        </div>
                        <p className="font-bold text-slate-900 font-sans text-xs">
                          {member.full_name} {member.baptismal_name ? `(${member.baptismal_name})` : ''}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          SQWK: {member.line_user_id || 'ID_BELUM_TERDAFTAR'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            bdayDeliveredToday
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-blue-100 text-blue-800 border-blue-300'
                          }`}
                        >
                          {bdayDeliveredToday ? 'CLEARED 07:00' : `SCHEDULED ${settings?.birthday_broadcast_time || '07:00'}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="my-6 text-center flex flex-col items-center justify-center p-6 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                <div className="p-3 bg-blue-50 rounded-full text-blue-600 mb-2">
                  <Gift className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-800">Tidak Ada Ulang Tahun Hari Ini</p>
                <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs">
                  Tidak ada data anggota komunitas yang berulang tahun pada tanggal hari ini ({todayDate} {MONTH_NAMES[todayMonth]}).
                </p>
              </div>
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Aturan: Batching jika &gt;{settings?.birthday_mention_limit || 20} mention
            </span>
            <Link href="/dashboard/birthdays/calendar" className="text-emerald-600 hover:text-emerald-700 font-medium">
              Lihat Kalender &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Automations Schedule & Guidelines */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800">
        <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">
          Jadwal Resmi Automasi (WIB) — MP Control System
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700/60">
            <div className="flex items-center space-x-2 text-amber-300 font-semibold mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{settings?.devotional_scraping_time || '00:00'} WIB</span>
            </div>
            <p className="font-medium text-white">Scraping The Katolik & LLM Processing</p>
            <p className="text-slate-400 text-[11px] mt-1">Mengambil artikel renungan, memformat ke Coffee Break with God.</p>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700/60">
            <div className="flex items-center space-x-2 text-blue-300 font-semibold mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{settings?.birthday_broadcast_time || '07:00'} WIB</span>
            </div>
            <p className="font-medium text-white">Birthday Broadcast</p>
            <p className="text-slate-400 text-[11px] mt-1">
              Otomatis mengirim ucapan ultah dengan LINE mention asli (Max {settings?.birthday_mention_limit || 20}/batch).
            </p>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700/60">
            <div className="flex items-center space-x-2 text-emerald-300 font-semibold mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{settings?.devotional_broadcast_time || '09:45'} WIB</span>
            </div>
            <p className="font-medium text-white">Devotional Broadcast</p>
            <p className="text-slate-400 text-[11px] mt-1">Mengirim renungan approved. Pending dikirim jika lolos validasi fallback.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
