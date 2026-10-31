'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import {
  BookOpen,
  Gift,
  CheckCircle2,
  Clock,
  Radio,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Bot,
  Users,
  ShieldCheck,
  Calendar,
  Send,
} from 'lucide-react';

export default function OverviewPage() {
  const { currentRole, currentUser } = useRole();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app we fetch from an API route or pass initial data
    async function loadStats() {
      try {
        const [groupsRes, membersRes] = await Promise.all([
          fetch('/api/groups').then((r) => r.json()).catch(() => ({ groups: [] })),
          fetch('/api/members').then((r) => r.json()).catch(() => ({ members: [] })),
        ]);

        const today = new Date();
        const todayDate = today.getDate();
        const todayMonth = today.getMonth() + 1;

        const bdayMembers = (membersRes.members || []).filter(
          (m: any) => m.status === 'active' && m.birth_date === todayDate && m.birth_month === todayMonth
        );

        setData({
          groups: groupsRes.groups || [],
          members: membersRes.members || [],
          birthdayToday: bdayMembers,
        });
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

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
              href="/dashboard/chat-simulator"
              className="inline-flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-white/15 backdrop-blur-sm transition-all"
            >
              <Bot className="w-4 h-4" />
              <span>Buka LINE Bot Simulator</span>
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
            <p className="text-xl font-bold text-slate-900">Connected</p>
            <p className="text-xs text-slate-500 mt-0.5">3 Grup Terdaftar (Broadcast-Only)</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Jalur: Web + LINE Chat</span>
            <Link href="/dashboard/line-bots" className="text-emerald-600 hover:text-emerald-700 font-medium">
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
              <span className="text-xl font-bold text-slate-900">Approved</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                Siap Kirim
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Jadwal Siaran: 09:45 WIB</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Fallback: Aktif</span>
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
            <p className="text-xl font-bold text-slate-900">3 Ulang Tahun</p>
            <p className="text-xs text-slate-500 mt-0.5">Jadwal Otomatis: 07:00 WIB</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-emerald-600 font-medium">Terkirim Hari Ini</span>
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
            <p className="text-xl font-bold text-slate-900">100% Sukses</p>
            <p className="text-xs text-slate-500 mt-0.5">0 Gagal • Idempotent Protection</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Riwayat Terarsip</span>
            <Link href="/dashboard/broadcast/history" className="text-emerald-600 hover:text-emerald-700 font-medium">
              Riwayat &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Split: Devotional Card + Birthday Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Today's Devotional & Audit Status */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
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
            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Audit: Approved ✅
            </span>
          </div>

          <div className="mt-4 flex-1 space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1">
                📖 Verse of The Day
              </span>
              <p className="text-sm font-semibold text-slate-900">Roma 12:2</p>
              <p className="text-xs text-slate-600 italic mt-1 leading-relaxed">
                "Janganlah kamu menjadi serupa dengan dunia ini, tetapi berubahlah oleh pembaruan budimu, sehingga kamu dapat membedakan manakah kehendak Allah: apa yang baik, yang berkenan kepada Allah dan yang sempurna."
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-700 block mb-1">🧠 Mind Check</span>
                <p className="text-slate-500 leading-relaxed text-[11px]">
                  Apakah hari ini tindakanku lebih banyak didorong oleh opini orang sekitar atau kerinduan menyenangkan hati Tuhan?
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-700 block mb-1">✨ Take One Step</span>
                <p className="text-slate-500 leading-relaxed text-[11px]">
                  Ambil jeda 3 menit hari ini untuk mendoakan seseorang yang sedang membuatmu merasa kesal atau lelah.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Auditor: <strong className="text-slate-700">Sr. Clara Bernadeth</strong> (Tim Liturgi)
            </span>
            <div className="flex items-center space-x-2">
              <Link
                href="/dashboard/devotionals/audit"
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              >
                Buka Audit Studio
              </Link>
              {(currentRole === 'superadmin' || currentRole === 'liturgi') && (
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

        {/* Right Column (5 cols): Today's Birthdays & Batching Info */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Gift className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-slate-800 text-base">Ulang Tahun Hari Ini</h2>
              </div>
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                Pukul 07:00 WIB
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-3 mb-4 leading-relaxed">
              Ucapan dikirimkan otomatis menggunakan LINE mention asli ke masing-masing grup dengan kutipan Lamentations 3:22-23 (Tanpa boneka 🧸).
            </p>

            {/* List of birthday members styled as Mini Flight Progress Strips */}
            <div className="space-y-2.5 font-mono">
              <div className="p-2.5 bg-slate-50 border border-slate-200/90 rounded-lg border-l-4 border-l-emerald-500 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-bold">
                    <span>CALLSIGN // MP-01</span>
                    <span className="text-slate-300">•</span>
                    <span>DEST: GRUP INTI MP</span>
                  </div>
                  <p className="font-bold text-slate-900 font-sans text-xs">Alexander Kevin Pratama</p>
                  <p className="text-[10px] text-slate-500 font-mono">SQWK: U_MEMBER_KEVIN_01</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300">
                    CLEARED 07:00
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200/90 rounded-lg border-l-4 border-l-emerald-500 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-bold">
                    <span>CALLSIGN // MP-02</span>
                    <span className="text-slate-300">•</span>
                    <span>DEST: GRUP INTI MP</span>
                  </div>
                  <p className="font-bold text-slate-900 font-sans text-xs">Theresia Angela Wijaya</p>
                  <p className="text-[10px] text-slate-500 font-mono">SQWK: U_MEMBER_ANGELA_02</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300">
                    CLEARED 07:00
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200/90 rounded-lg border-l-4 border-l-emerald-500 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-bold">
                    <span>CALLSIGN // MP-03</span>
                    <span className="text-slate-300">•</span>
                    <span>DEST: GRUP INTI MP</span>
                  </div>
                  <p className="font-bold text-slate-900 font-sans text-xs">Benedictus Ryan Santoso</p>
                  <p className="text-[10px] text-slate-500 font-mono">SQWK: U_MEMBER_RYAN_03</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300">
                    CLEARED 07:00
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Aturan: Batching jika &gt;20 mention</span>
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
              <span>00:00 WIB</span>
            </div>
            <p className="font-medium text-white">Scraping The Katolik & LLM Processing</p>
            <p className="text-slate-400 text-[11px] mt-1">Mengambil artikel renungan, memformat ke Coffee Break with God.</p>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700/60">
            <div className="flex items-center space-x-2 text-blue-300 font-semibold mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>07:00 WIB</span>
            </div>
            <p className="font-medium text-white">Birthday Broadcast</p>
            <p className="text-slate-400 text-[11px] mt-1">Otomatis mengirim ucapan ultah dengan LINE mention asli (Max 20/batch).</p>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700/60">
            <div className="flex items-center space-x-2 text-emerald-300 font-semibold mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>09:45 WIB</span>
            </div>
            <p className="font-medium text-white">Devotional Broadcast</p>
            <p className="text-slate-400 text-[11px] mt-1">Mengirim renungan approved. Pending dikirim jika lolos validasi fallback.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
