'use client';

import React, { useState, useEffect } from 'react';
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
  Copy,
  Check,
  Edit3,
  ExternalLink,
  Info,
} from 'lucide-react';

export default function LineBotManagementPage() {
  const { currentRole } = useRole();
  const [loading, setLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Bot Config State
  const [botData, setBotData] = useState<{
    id: string;
    name: string;
    channelId: string;
    channelSecretMasked: string;
    channelAccessTokenMasked: string;
    status: string;
    isConfigured: boolean;
    source: string;
  }>({
    id: '',
    name: 'MP Community Official Bot',
    channelId: '',
    channelSecretMasked: '••••••••••••••••',
    channelAccessTokenMasked: '••••••••••••••••',
    status: 'disconnected',
    isConfigured: false,
    source: 'database',
  });

  const [webhookUrl, setWebhookUrl] = useState('');

  // Modal Edit States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editChannelId, setEditChannelId] = useState('');
  const [editChannelSecret, setEditChannelSecret] = useState('');
  const [editChannelAccessToken, setEditChannelAccessToken] = useState('');
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const loadBotConfig = async () => {
    try {
      const res = await fetch('/api/line/config');
      if (res.ok) {
        const data = await res.json();
        if (data.bot) {
          setBotData(data.bot);
          setEditName(data.bot.name);
          setEditChannelId(data.bot.channelId);
        }
      }
    } catch (err) {
      console.error('Failed loading LINE bot config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBotConfig();
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/line/webhook`);
    }
  }, []);

  const handleCopyWebhook = () => {
    if (typeof navigator !== 'undefined' && webhookUrl) {
      navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2500);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/line/config', { method: 'POST' });
      const data = await res.json();

      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message,
        });
        loadBotConfig();
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Gagal memverifikasi koneksi ke LINE Messaging API.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Terjadi kesalahan sistem saat menghubungi server LINE.',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCredentials(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const res = await fetch('/api/line/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          channelId: editChannelId,
          channelSecret: editChannelSecret || undefined,
          channelAccessToken: editChannelAccessToken || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSaveSuccess('Kredensial LINE Bot berhasil disimpan dan diperbarui!');
        setShowEditModal(false);
        setEditChannelSecret('');
        setEditChannelAccessToken('');
        await loadBotConfig();
      } else {
        setSaveError(data.error || 'Gagal menyimpan kredensial LINE Bot.');
      }
    } catch (err: any) {
      setSaveError(err.message || 'Terjadi kesalahan sistem saat menyimpan kredensial.');
    } finally {
      setSavingCredentials(false);
    }
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

        <div className="flex items-center gap-2.5">
          {currentRole === 'superadmin' && (
            <button
              onClick={() => {
                setSaveError(null);
                setShowEditModal(true);
              }}
              className="inline-flex items-center space-x-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Ubah Kredensial</span>
            </button>
          )}

          <button
            onClick={handleTestConnection}
            disabled={testingConnection}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
            <span>{testingConnection ? 'Menguji Koneksi...' : 'Uji Koneksi Bot'}</span>
          </button>
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{saveSuccess}</span>
          </div>
          <button onClick={() => setSaveSuccess(null)} className="text-emerald-500 hover:text-emerald-700 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Test Result Alert */}
      {testResult && (
        <div
          className={`p-4 rounded-xl text-xs border flex items-center justify-between ${
            testResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
          <button onClick={() => setTestResult(null)} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
      )}

      {/* Bot Card Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Credentials Form */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm">LINE Channel Credentials</h3>
            <span
              className={`flex items-center space-x-1.5 text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                botData.isConfigured
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  botData.isConfigured ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              ></span>
              <span>{botData.isConfigured ? 'Status: Connected' : 'Status: Belum Terhubung'}</span>
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bot Name</label>
              <input
                type="text"
                readOnly
                value={botData.name}
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-800 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">LINE Channel ID</label>
              <input
                type="text"
                readOnly
                value={botData.channelId || '(Belum dikonfigurasi)'}
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Channel Secret (Backend Secret)</label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={botData.channelSecretMasked}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg font-mono text-slate-800 pr-10"
                />
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Channel Access Token</label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={botData.channelAccessTokenMasked}
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
                  value={webhookUrl}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg font-mono text-slate-800 text-[11px]"
                />
                <button
                  type="button"
                  onClick={handleCopyWebhook}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium whitespace-nowrap transition-colors"
                >
                  {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWebhook ? 'Tersalin!' : 'Salin URL'}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Daftarkan URL ini pada <strong>LINE Developers Console</strong> di bagian <em>Messaging API &gt; Webhook settings</em> dan aktifkan tombol toggle <strong>"Use webhook"</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Bot Policies & Quick Setup Guide */}
        <div className="space-y-4">
          {/* Quick Setup Checklist */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-1.5 text-emerald-700">
              <Key className="w-4 h-4" />
              <span>Langkah Cepat Konfigurasi</span>
            </h3>

            <div className="space-y-2.5 text-slate-600 text-[11px] leading-relaxed">
              <div className="flex items-start space-x-2">
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                  1
                </span>
                <p>
                  Buka{' '}
                  <a
                    href="https://developers.line.biz/console/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-600 underline font-semibold inline-flex items-center"
                  >
                    LINE Developers Console <ExternalLink className="w-2.5 h-2.5 ml-0.5 inline" />
                  </a>{' '}
                  dan pilih channel <strong>Messaging API</strong> Anda.
                </p>
              </div>

              <div className="flex items-start space-x-2">
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                  2
                </span>
                <p>
                  Di tab <strong>Basic settings</strong>, salin <em>Channel ID</em> & <em>Channel Secret</em>.
                </p>
              </div>

              <div className="flex items-start space-x-2">
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                  3
                </span>
                <p>
                  Di tab <strong>Messaging API</strong>, generate <em>Channel access token (long-lived)</em>.
                </p>
              </div>

              <div className="flex items-start space-x-2">
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                  4
                </span>
                <p>
                  Klik tombol <strong>"Ubah Kredensial"</strong> di atas, masukkan ketiga data tersebut lalu klik <em>Simpan</em>.
                </p>
              </div>

              <div className="flex items-start space-x-2">
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                  5
                </span>
                <p>
                  Salin <strong>Webhook URL</strong> di atas, tempel di LINE Developers Console, lalu aktifkan toggle <strong>"Use webhook"</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Bot Policies & Rules */}
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

      {/* Edit Credentials Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Ubah Kredensial LINE Bot</h3>
                  <p className="text-xs text-slate-500">Konfigurasikan channel LINE Messaging API Anda.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
              >
                &times;
              </button>
            </div>

            {saveError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCredentials} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Bot</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Contoh: MP Official Bot"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  LINE Channel ID <span className="text-slate-400 font-normal">(Dari Basic Settings)</span>
                </label>
                <input
                  type="text"
                  required
                  value={editChannelId}
                  onChange={(e) => setEditChannelId(e.target.value)}
                  placeholder="Contoh: 2006123456"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Channel Secret <span className="text-slate-400 font-normal">(Dari Basic Settings)</span>
                </label>
                <input
                  type="password"
                  value={editChannelSecret}
                  onChange={(e) => setEditChannelSecret(e.target.value)}
                  placeholder="Masukkan Channel Secret (Kosongkan jika tidak ingin diubah)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Channel Access Token (Long-Lived) <span className="text-slate-400 font-normal">(Dari Messaging API tab)</span>
                </label>
                <textarea
                  rows={3}
                  value={editChannelAccessToken}
                  onChange={(e) => setEditChannelAccessToken(e.target.value)}
                  placeholder="Masukkan Channel Access Token (Kosongkan jika tidak ingin diubah)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingCredentials}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center space-x-1.5"
                >
                  {savingCredentials && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{savingCredentials ? 'Menyimpan...' : 'Simpan Kredensial'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
