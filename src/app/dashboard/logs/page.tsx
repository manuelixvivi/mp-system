'use client';

import React, { useState } from 'react';
import { useRole } from '@/context/RoleContext';
import {
  FileText,
  Shield,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Code,
} from 'lucide-react';

export default function ActivityLogsPage() {
  const { currentRole } = useRole();
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const logs = [
    {
      id: 'log_001',
      actor: 'Sr. Clara Bernadeth',
      role: 'liturgi',
      action: 'devotional_approved',
      entity: 'devotional (Roma 12:2)',
      channel: 'Web Dashboard',
      time: 'Hari ini, 08:15:30 WIB',
      details: {
        devotionalDate: '2026-10-30',
        verse: 'Roma 12:2',
        auditor: 'Sr. Clara Bernadeth',
        status: 'approved',
        note: 'Konten disetujui untuk siaran 09:45 WIB',
      },
    },
    {
      id: 'log_002',
      actor: 'System Scheduler',
      role: 'system',
      action: 'birthday_broadcast_sent',
      entity: 'birthday (Grup Inti MP)',
      channel: 'Cron 07:00 WIB',
      time: 'Hari ini, 07:00:02 WIB',
      details: {
        group: 'Grup Inti MP Community',
        recipients: ['Kevin Pratama', 'Angela W', 'Ryan Santoso'],
        batches: 1,
        totalMentions: 3,
        format: 'textV2 native mention',
      },
    },
    {
      id: 'log_003',
      actor: 'System Scheduler',
      role: 'system',
      action: 'devotional_scraped_and_processed',
      entity: 'devotional (The Katolik)',
      channel: 'Cron 00:00 WIB',
      time: 'Hari ini, 00:00:15 WIB',
      details: {
        sourceUrl: 'https://www.thekatolik.com/2026/10/renungan-harian-katolik-hari-ini.html',
        model: 'Gemini LLM',
        verseReference: 'Roma 12:2',
        status: 'pending audit',
      },
    },
    {
      id: 'log_004',
      actor: 'Fr. Michael Tan',
      role: 'superadmin',
      action: 'line_command_received',
      entity: 'line_bot (/status)',
      channel: 'LINE Personal Chat',
      time: 'Kemarin, 21:10:00 WIB',
      details: {
        lineUserId: 'U_SUPERADMIN_001',
        command: '/status',
        authenticated: true,
        responseSent: true,
      },
    },
    {
      id: 'log_005',
      actor: 'Antonius Budi',
      role: 'logistik',
      action: 'member_created',
      entity: 'member (Theresia Angela Wijaya)',
      channel: 'Web Dashboard',
      time: 'Kemarin, 14:05:22 WIB',
      details: {
        memberName: 'Theresia Angela Wijaya',
        birthDate: '30/10',
        lineUserId: 'U_MEMBER_ANGELA_02',
      },
    },
  ];

  if (currentRole !== 'superadmin') {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center max-w-lg mx-auto mt-12 space-y-3">
        <Shield className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Akses Dibatasi Khusus Superadmin</h2>
        <p className="text-xs text-slate-500">
          Halaman Activity Logs hanya dapat diakses oleh Superadmin untuk audit kepatuhan dan pelacakan seluruh peristiwa sistem.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full font-medium inline-flex mb-2">
            <FileText className="w-3.5 h-3.5" />
            <span>Audit Trail & Activity Logging • Superadmin Only</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Activity Logs</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log seluruh aktivitas sistem, webhook command LINE, pengiriman broadcast, dan aksi audit konten.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Logs Table */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3">Aktor / Pengguna</th>
                  <th className="px-5 py-3">Aksi & Entitas</th>
                  <th className="px-5 py-3">Jalur</th>
                  <th className="px-5 py-3">Waktu (WIB)</th>
                  <th className="px-5 py-3 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-900">{log.actor}</p>
                      <span className="text-[10px] text-slate-400 capitalize">{log.role}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-mono text-emerald-700 font-medium">{log.action}</p>
                      <p className="text-[11px] text-slate-500">{log.entity}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{log.channel}</td>
                    <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap">{log.time}</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-[11px] text-emerald-600 hover:underline font-medium">
                        Lihat JSON
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (4 cols): JSON Payload Inspector */}
        <div className="lg:col-span-4 bg-slate-900 text-white rounded-xl p-5 shadow-lg border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800 mb-3 text-emerald-400">
              <Code className="w-4 h-4" />
              <h3 className="font-bold text-xs uppercase tracking-wider">Audit Payload Inspector</h3>
            </div>

            {selectedLog ? (
              <div className="space-y-3">
                <div className="text-xs">
                  <p className="text-slate-400">Aksi Terpilih:</p>
                  <p className="font-mono text-emerald-300 font-bold">{selectedLog.action}</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">Oleh: {selectedLog.actor}</p>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 overflow-x-auto max-h-80">
                  <pre className="text-[11px] font-mono text-slate-300">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-slate-500">
                Klik salah satu baris log pada tabel untuk memeriksa JSON payload terperinci.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-400">
            Activity logs disimpan permanen untuk keperluan audit dan kepatuhan sistem.
          </div>
        </div>
      </div>
    </div>
  );
}
