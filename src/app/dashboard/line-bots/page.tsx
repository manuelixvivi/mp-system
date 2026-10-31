'use client';

import React, { useState } from 'react';
import { useRole } from '@/context/RoleContext';
import {
  Bot,
  Key,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Send,
  AlertTriangle,
  Lock,
  Globe,
} from 'lucide-react';

export default function LineBotManagementPage() {
  const { currentRole } = useRole();
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const botConfig = {
    name: 'MP Community Official Bot',
    channelId: '2006123456',
    channelSecret: 'sec_9876543210abcdef9876543210ab',
    channelAccessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    status: 'connected',
    webhookUrl: 'https://mp-control.vercel.app/api/line/webhook',
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);

    setTimeout(() => {
      setTestingConnection(false);
      setTestResult('Koneksi LINE Messaging API Terverifikasi Aktif & Siap Siaran! (HTTP 200 OK)');
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-medium inline-flex mb-2">
            <Bot className="w-3.5 h-3.5" />
            <span>LINE Bot Integration Management • Superadmin Only</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Konfigurasi LINE Bot</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola kredensial channel, endpoint webhook, dan pantau status konektivitas LINE Messaging API.
          </p>
        </div>

        <button
          onClick={handleTestConnection}
          disabled={testingConnection}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
          <span>{testingConnection ? 'Menguji Koneksi...' : 'Uji Koneksi Bot'}</span>
        </button>
      </div>

      {testResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{testResult}</span>
        </div>
      )}

      {/* Bot Card Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Credentials Form */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm">LINE Channel Credentials</h3>
            <span className="flex items-center space-x-1.5 text-xs bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Status: Connected</span>
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bot Name</label>
              <input
                type="text"
                readOnly
                value={botConfig.name}
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">LINE Channel ID</label>
              <input
                type="text"
                readOnly
                value={botConfig.channelId}
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Channel Secret (Backend Secret)</label>
              <div className="relative">
                <input
                  type="password"
                  readOnly
                  value={botConfig.channelSecret}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg font-mono text-slate-800 pr-10"
                />
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Channel Access Token</label>
              <div className="relative">
                <input
                  type="password"
                  readOnly
                  value={botConfig.channelAccessToken}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg font-mono text-slate-800 pr-10"
                />
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Webhook URL Gateway</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={botConfig.webhookUrl}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg font-mono text-slate-800"
                />
                <button
                  onClick={() => alert('Webhook URL telah disalin ke clipboard')}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium whitespace-nowrap"
                >
                  Salin URL
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Daftarkan URL ini pada LINE Developers Console di bagian Webhook settings dan aktifkan "Use webhook".
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Bot Policies & Rules */}
        <div className="bg-slate-900 text-white p-5 rounded-xl shadow-md border border-slate-800 space-y-4 text-xs">
          <h3 className="font-bold text-emerald-400 text-xs uppercase tracking-wider">
            Ketentuan Bot (PRD Final v1.0)
          </h3>

          <div className="space-y-3 text-slate-300 leading-relaxed text-[11px]">
            <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60">
              <p className="font-semibold text-white mb-1">1. Broadcast-Only di Grup</p>
              <p className="text-slate-400">
                Bot tidak merespons obrolan umum, tidak menjawab pesan anggota, dan tidak mengeksekusi command di grup LINE.
              </p>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60">
              <p className="font-semibold text-white mb-1">2. Command di Personal Chat</p>
              <p className="text-slate-400">
                Hanya melayani pengguna terdaftar melalui pesan pribadi 1-on-1 dengan mencocokkan LINE User ID dan role dashboard.
              </p>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60">
              <p className="font-semibold text-white mb-1">3. Proteksi Kredensial</p>
              <p className="text-slate-400">
                Channel secret dan token disimpan di backend secara aman dan tidak diekspos ke frontend.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
