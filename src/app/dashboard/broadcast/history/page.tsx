'use client';

import React, { useState } from 'react';
import { useRole } from '@/context/RoleContext';
import {
  History,
  BookOpen,
  Gift,
  CheckCircle2,
  AlertCircle,
  Filter,
  Search,
  Radio,
  Clock,
} from 'lucide-react';

export default function BroadcastHistoryPage() {
  const { currentRole } = useRole();
  const [filterModule, setFilterModule] = useState<'all' | 'devotional' | 'birthday'>('all');

  const historyItems = [
    {
      id: 'del_001',
      module: 'devotional',
      groupName: 'Grup Inti MP Community',
      groupId: 'c-mp-inti-001',
      deliveryType: 'scheduled',
      senderChannel: 'system_cron',
      senderName: 'System Scheduler (09:45 WIB)',
      status: 'success',
      idempotencyKey: 'devotional_2026-10-30_55555555-5555-5555-5555-555555555551',
      deliveredAt: 'Hari ini, 09:45:00 WIB',
      verse: 'Roma 12:2',
    },
    {
      id: 'del_002',
      module: 'birthday',
      groupName: 'Grup Inti MP Community',
      groupId: 'c-mp-inti-001',
      deliveryType: 'scheduled',
      senderChannel: 'system_cron',
      senderName: 'System Scheduler (07:00 WIB)',
      status: 'success',
      idempotencyKey: 'birthday_2026-10-30_55555555-5555-5555-5555-555555555551',
      deliveredAt: 'Hari ini, 07:00:00 WIB',
      verse: 'Lamentations 3:22-23 (3 Anggota)',
    },
    {
      id: 'del_003',
      module: 'devotional',
      groupName: 'Grup OMK & Youth MP',
      groupId: 'c-mp-youth-002',
      deliveryType: 'scheduled',
      senderChannel: 'system_cron',
      senderName: 'System Scheduler (09:45 WIB)',
      status: 'success',
      idempotencyKey: 'devotional_2026-10-30_55555555-5555-5555-5555-555555555552',
      deliveredAt: 'Hari ini, 09:45:00 WIB',
      verse: 'Roma 12:2',
    },
    {
      id: 'del_004',
      module: 'devotional',
      groupName: 'Grup Pengurus & Pelayan MP',
      groupId: 'c-mp-pengurus-003',
      deliveryType: 'manual',
      senderChannel: 'line_chat',
      senderName: 'Sr. Clara Bernadeth (via LINE /broadcast)',
      status: 'success',
      idempotencyKey: 'manual_chat_dev_17618491823_grp03',
      deliveredAt: 'Kemarin, 14:20:15 WIB',
      verse: 'Filipi 4:13',
    },
    {
      id: 'del_005',
      module: 'birthday',
      groupName: 'Grup OMK & Youth MP',
      groupId: 'c-mp-youth-002',
      deliveryType: 'manual',
      senderChannel: 'dashboard',
      senderName: 'Antonius Budi (via Web Studio)',
      status: 'success',
      idempotencyKey: 'manual_dash_bday_1761849921_grp02',
      deliveredAt: '2 hari lalu, 11:05:00 WIB',
      verse: 'Lamentations 3:22-23 (1 Anggota)',
    },
  ];

  const filtered = historyItems.filter((item) => {
    if (filterModule === 'all') return true;
    return item.module === filterModule;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full font-medium inline-flex mb-2">
            <History className="w-3.5 h-3.5" />
            <span>Riwayat & Status Pengiriman Broadcast</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Broadcast History</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar lengkap seluruh siaran terjadwal maupun manual yang dikirimkan ke grup LINE beserta kunci idempotensi.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setFilterModule('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filterModule === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua Modul
          </button>
          <button
            onClick={() => setFilterModule('devotional')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filterModule === 'devotional' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Devotional
          </button>
          <button
            onClick={() => setFilterModule('birthday')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filterModule === 'birthday' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Birthday
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Modul & Konten</th>
                <th className="px-5 py-3">Grup LINE Tujuan</th>
                <th className="px-5 py-3">Tipe & Jalur Pengiriman</th>
                <th className="px-5 py-3">Pengirim / Trigger</th>
                <th className="px-5 py-3">Waktu (WIB)</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center space-x-2.5">
                      <div
                        className={`p-1.5 rounded-lg ${
                          item.module === 'devotional'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {item.module === 'devotional' ? (
                          <BookOpen className="w-4 h-4" />
                        ) : (
                          <Gift className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 capitalize">
                          {item.module === 'devotional' ? 'Coffee Break with God' : 'Birthday Greeting'}
                        </p>
                        <p className="text-[11px] text-slate-500">{item.verse}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-slate-800">{item.groupName}</p>
                    <p className="font-mono text-[10px] text-slate-400">{item.groupId}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block ${
                        item.deliveryType === 'scheduled'
                          ? 'bg-slate-100 text-slate-700 border border-slate-200'
                          : 'bg-purple-100 text-purple-700 border border-purple-200'
                      }`}
                    >
                      {item.deliveryType.toUpperCase()} ({item.senderChannel})
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-700 font-medium">{item.senderName}</td>
                  <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{item.deliveredAt}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Terkirim</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
