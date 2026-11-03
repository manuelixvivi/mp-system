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
  Sparkles,
  Cpu,
  Layers,
  Zap,
} from 'lucide-react';

export default function LineBotManagementPage() {
  const { currentRole } = useRole();
  const [activeTab, setActiveTab] = useState<'line' | 'groq'>('line');
  const [loading, setLoading] = useState(true);

  // ==========================================
  // LINE Bot States
  // ==========================================
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

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

  // Modal Edit LINE States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editChannelId, setEditChannelId] = useState('');
  const [editChannelSecret, setEditChannelSecret] = useState('');
  const [editChannelAccessToken, setEditChannelAccessToken] = useState('');
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // ==========================================
  // Groq API States
  // ==========================================
  const [groqKeyInput, setGroqKeyInput] = useState('');
  const [groqKeyMasked, setGroqKeyMasked] = useState('');
  const [isGroqConfigured, setIsGroqConfigured] = useState(false);
  const [selectedGroqModel, setSelectedGroqModel] = useState('llama-3.3-70b-versatile');
  const [availableGroqModels, setAvailableGroqModels] = useState<Array<{ id: string; owned_by: string }>>([
    { id: 'llama-3.3-70b-versatile', owned_by: 'Meta' },
    { id: 'llama-3.1-8b-instant', owned_by: 'Meta' },
    { id: 'mixtral-8x7b-32768', owned_by: 'Mistral' },
    { id: 'gemma2-9b-it', owned_by: 'Google' },
  ]);
  const [fetchingGroqModels, setFetchingGroqModels] = useState(false);
  const [savingGroq, setSavingGroq] = useState(false);
  const [testingGroq, setTestingGroq] = useState(false);
  const [groqSuccessMsg, setGroqSuccessMsg] = useState<string | null>(null);
  const [groqErrorMsg, setGroqErrorMsg] = useState<string | null>(null);
  const [groqTestOutput, setGroqTestOutput] = useState<{ message: string; sampleReply?: string } | null>(null);

  // ==========================================
  // Data Loaders
  // ==========================================
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
    }
  };

  const loadGroqConfig = async () => {
    try {
      const res = await fetch('/api/groq');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setGroqKeyMasked(data.config.groq_api_key_masked || '');
          setIsGroqConfigured(data.config.is_configured);
          if (data.config.groq_model) {
            setSelectedGroqModel(data.config.groq_model);
          }
        }
      }
    } catch (err) {
      console.error('Failed loading Groq config:', err);
    }
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([loadBotConfig(), loadGroqConfig()]);
      if (typeof window !== 'undefined') {
        setWebhookUrl(`${window.location.origin}/api/line/webhook`);
      }
      setLoading(false);
    }
    init();
  }, []);

  // ==========================================
  // LINE Handlers
  // ==========================================
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

  // ==========================================
  // Groq Handlers
  // ==========================================
  const handleFetchLiveGroqModels = async () => {
    setFetchingGroqModels(true);
    setGroqErrorMsg(null);
    setGroqSuccessMsg(null);

    try {
      const keyToUse = groqKeyInput.trim() || undefined;
      const url = keyToUse
        ? `/api/groq?action=models&key=${encodeURIComponent(keyToUse)}`
        : `/api/groq?action=models`;

      const res = await fetch(url);
      const data = await res.json();

      if (res.ok && data.models) {
        setAvailableGroqModels(data.models);
        setGroqSuccessMsg(`Berhasil mengambil ${data.models.length} model aktif secara live dari Groq API!`);
        // If current selected is not in list, keep or pick first
        if (!data.models.some((m: any) => m.id === selectedGroqModel) && data.models.length > 0) {
          setSelectedGroqModel(data.models[0].id);
        }
      } else {
        setGroqErrorMsg(data.error || 'Gagal mengambil daftar model dari Groq.');
      }
    } catch (err: any) {
      setGroqErrorMsg(err.message || 'Terjadi kesalahan saat memanggil API Groq.');
    } finally {
      setFetchingGroqModels(false);
    }
  };

  const handleSaveGroqSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGroq(true);
    setGroqErrorMsg(null);
    setGroqSuccessMsg(null);

    try {
      const res = await fetch('/api/groq', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groq_api_key: groqKeyInput ? groqKeyInput.trim() : undefined,
          groq_model: selectedGroqModel,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setGroqSuccessMsg(data.message || 'Pengaturan Groq API & Model berhasil disimpan!');
        setGroqKeyInput('');
        await loadGroqConfig();
      } else {
        setGroqErrorMsg(data.error || 'Gagal menyimpan pengaturan Groq API.');
      }
    } catch (err: any) {
      setGroqErrorMsg(err.message || 'Terjadi kesalahan sistem saat menyimpan.');
    } finally {
      setSavingGroq(false);
    }
  };

  const handleTestGroqAI = async () => {
    setTestingGroq(true);
    setGroqErrorMsg(null);
    setGroqSuccessMsg(null);
    setGroqTestOutput(null);

    try {
      const res = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groq_api_key: groqKeyInput ? groqKeyInput.trim() : undefined,
          groq_model: selectedGroqModel,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setGroqTestOutput({
          message: data.message,
          sampleReply: data.sampleReply,
        });
        setGroqSuccessMsg('Tes inferensi Groq AI sukses!');
      } else {
        setGroqErrorMsg(data.error || 'Tes koneksi Groq AI gagal.');
      }
    } catch (err: any) {
      setGroqErrorMsg(err.message || 'Terjadi kesalahan saat menguji Groq AI.');
    } finally {
      setTestingGroq(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-medium inline-flex mb-2">
            <Bot className="w-3.5 h-3.5" />
            <span>Integrasi & Konfigurasi Eksternal • Superadmin Only</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Konfigurasi LINE Bot & Groq AI</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola kredensial channel LINE Messaging API, Webhook gateway, serta API Key dan pilihan Model Groq AI.
          </p>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('line')}
            className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'line'
                ? 'bg-white text-emerald-700 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>LINE Bot Official</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('groq')}
            className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'groq'
                ? 'bg-white text-purple-700 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Groq API & Model</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: LINE BOT CONFIGURATION                             */}
      {/* ========================================================= */}
      {activeTab === 'line' && (
        <div className="space-y-6">
          {/* Subheader Action Bar */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Pengaturan integrasi pesan siaran dan bot chat pribadi 1-on-1.
            </span>
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
              <button
                onClick={() => setSaveSuccess(null)}
                className="text-emerald-500 hover:text-emerald-700 font-bold"
              >
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
                  <label className="block font-semibold text-slate-700 mb-1">
                    Channel Secret (Backend Secret)
                  </label>
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
                      {copiedWebhook ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedWebhook ? 'Tersalin!' : 'Salin URL'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Daftarkan URL ini pada <strong>LINE Developers Console</strong> di bagian{' '}
                    <em>Messaging API &gt; Webhook settings</em> dan aktifkan tombol toggle{' '}
                    <strong>"Use webhook"</strong>.
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
                      Di tab <strong>Messaging API</strong>, generate{' '}
                      <em>Channel access token (long-lived)</em>.
                    </p>
                  </div>

                  <div className="flex items-start space-x-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                      4
                    </span>
                    <p>
                      Klik tombol <strong>"Ubah Kredensial"</strong> di atas, masukkan ketiga data tersebut lalu
                      klik <em>Simpan</em>.
                    </p>
                  </div>

                  <div className="flex items-start space-x-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                      5
                    </span>
                    <p>
                      Salin <strong>Webhook URL</strong> di atas, tempel di LINE Developers Console, lalu aktifkan
                      toggle <strong>"Use webhook"</strong>.
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
                      Bot tidak merespons obrolan umum, tidak menjawab pesan anggota, dan tidak mengeksekusi
                      command di grup LINE.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60">
                    <p className="font-semibold text-white mb-1">2. Command di Personal Chat</p>
                    <p className="text-slate-400">
                      Hanya melayani pengguna terdaftar melalui pesan pribadi 1-on-1 dengan mencocokkan LINE User ID
                      dan role dashboard.
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
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: GROQ API & MODEL SELECTION                         */}
      {/* ========================================================= */}
      {activeTab === 'groq' && (
        <div className="space-y-6">
          {/* Subheader info */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-purple-900/10 via-purple-50 to-indigo-50/50 p-4 rounded-xl border border-purple-200">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Groq Cloud AI Engine</h3>
                <p className="text-xs text-slate-600">
                  Digunakan untuk mengekstrak dan memformat artikel Katolik menjadi format resmi{' '}
                  <strong>Coffee Break with God</strong> dengan kecepatan inferensi tinggi (LPUs).
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span
                className={`flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full font-semibold border ${
                  isGroqConfigured
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isGroqConfigured ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                ></span>
                <span>{isGroqConfigured ? 'Groq API: Aktif' : 'Belum Dikonfigurasi'}</span>
              </span>
            </div>
          </div>

          {/* Success / Error Alerts */}
          {groqSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{groqSuccessMsg}</span>
              </div>
              <button
                onClick={() => setGroqSuccessMsg(null)}
                className="text-emerald-500 hover:text-emerald-700 font-bold"
              >
                &times;
              </button>
            </div>
          )}

          {groqErrorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{groqErrorMsg}</span>
              </div>
              <button
                onClick={() => setGroqErrorMsg(null)}
                className="text-rose-500 hover:text-rose-700 font-bold"
              >
                &times;
              </button>
            </div>
          )}

          {/* Test Output Card */}
          {groqTestOutput && (
            <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-semibold text-emerald-400 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{groqTestOutput.message}</span>
                </span>
                <button
                  onClick={() => setGroqTestOutput(null)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  Tutup
                </button>
              </div>
              {groqTestOutput.sampleReply && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300">
                  <p className="text-[10px] text-slate-500 uppercase font-sans font-bold mb-1">
                    Output Balasan Uji Coba:
                  </p>
                  <p className="whitespace-pre-wrap">{groqTestOutput.sampleReply}</p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 cols: Groq Key & Model Form */}
            <form
              onSubmit={handleSaveGroqSettings}
              className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-purple-600" />
                  <h3 className="font-bold text-slate-800 text-sm">Pengaturan Kredensial & Model Groq</h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">client.models.list() live integration</span>
              </div>

              {/* 1. API Key Input */}
              <div className="space-y-1.5 text-xs">
                <label className="block font-semibold text-slate-700">
                  Groq API Key (GROQ_API_KEY)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={groqKeyInput}
                    onChange={(e) => setGroqKeyInput(e.target.value)}
                    placeholder={
                      groqKeyMasked ? `Tersimpan: ${groqKeyMasked} (Kosongkan jika tidak diganti)` : 'gsk_...'
                    }
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-xs pr-10"
                  />
                  <Key className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                </div>
                <p className="text-[11px] text-slate-500">
                  Dapatkan API Key gratis di{' '}
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-600 underline font-semibold inline-flex items-center"
                  >
                    console.groq.com/keys <ExternalLink className="w-2.5 h-2.5 ml-0.5 inline" />
                  </a>
                  . Kunci akan disimpan aman dan tidak diekspos ke publik.
                </p>
              </div>

              {/* 2. Model Selection Dropdown with Live Fetch */}
              <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-slate-700">
                    Pilihan Model Groq yang Tersedia
                  </label>
                  <button
                    type="button"
                    onClick={handleFetchLiveGroqModels}
                    disabled={fetchingGroqModels}
                    className="inline-flex items-center space-x-1.5 text-[11px] font-semibold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-md transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${fetchingGroqModels ? 'animate-spin' : ''}`} />
                    <span>{fetchingGroqModels ? 'Memuat Model...' : 'Muat Daftar Model Live'}</span>
                  </button>
                </div>

                <select
                  value={selectedGroqModel}
                  onChange={(e) => setSelectedGroqModel(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-xs bg-white text-slate-900"
                >
                  {availableGroqModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id} {m.owned_by ? `(${m.owned_by})` : ''}
                    </option>
                  ))}
                </select>

                {/* Recommended Badge Chips */}
                <div className="pt-1">
                  <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                    Model Rekomendasi Terpopuler:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'llama-3.3-70b-versatile', label: 'llama-3.3-70b (Rekomendasi Utama Katolik)' },
                      { id: 'llama-3.1-8b-instant', label: 'llama-3.1-8b (Super Cepat)' },
                      { id: 'mixtral-8x7b-32768', label: 'mixtral-8x7b (32k Context)' },
                    ].map((rec) => (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => setSelectedGroqModel(rec.id)}
                        className={`text-[10.5px] px-2.5 py-1 rounded-full font-mono transition-all ${
                          selectedGroqModel === rec.id
                            ? 'bg-purple-600 text-white font-bold shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {rec.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleTestGroqAI}
                  disabled={testingGroq}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                >
                  <Zap className={`w-3.5 h-3.5 text-amber-400 ${testingGroq ? 'animate-bounce' : ''}`} />
                  <span>{testingGroq ? 'Menguji Inferensi...' : 'Uji Koneksi AI Groq'}</span>
                </button>

                <button
                  type="submit"
                  disabled={savingGroq}
                  className="inline-flex items-center space-x-2 px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${savingGroq ? 'animate-spin' : ''}`} />
                  <span>{savingGroq ? 'Menyimpan...' : 'Simpan Pengaturan Groq'}</span>
                </button>
              </div>
            </form>

            {/* Right Column: Code & Architecture Info */}
            <div className="space-y-4">
              {/* How it works card */}
              <div className="bg-slate-900 text-white p-5 rounded-xl shadow-md border border-slate-800 space-y-3.5 text-xs">
                <div className="flex items-center space-x-2 text-purple-400 font-bold uppercase tracking-wider text-[11px]">
                  <Layers className="w-4 h-4" />
                  <span>Arsitektur Groq di MP System</span>
                </div>

                <div className="space-y-2.5 text-[11px] text-slate-300 leading-relaxed">
                  <p>
                    Saat jadwal scraping berjalan pada pukul <strong>00:00 WIB</strong>, teks renungan dari The
                    Katolik akan diteruskan ke Groq API menggunakan model yang Anda pilih di samping.
                  </p>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[10px] text-emerald-400">
                    <p className="text-slate-400">// Format JSON yang diekstrak:</p>
                    <p>• verse_reference</p>
                    <p>• verse_text</p>
                    <p>• reflection</p>
                    <p>• mind_check</p>
                    <p>• take_one_step</p>
                  </div>
                  <p className="text-slate-400">
                    Jika Groq API tidak tersedia atau kuota habis, sistem memiliki proteksi otomatis yang beralih
                    ke Gemini API dan mesin deterministik liturgi Katolik.
                  </p>
                </div>
              </div>

              {/* Code snippet reference */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs">
                <span className="font-bold text-slate-800 text-xs block">
                  Referensi Kode Live Model Groq:
                </span>
                <pre className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-700 overflow-x-auto leading-relaxed">
{`from groq import Groq

client = Groq()
models = client.models.list()
for model in models.data:
    print(f"- {model.id}")`}
                </pre>
                <p className="text-[10px] text-slate-400">
                  Tombol <em>"Muat Daftar Model Live"</em> mengeksekusi logika ini langsung ke server Groq Cloud.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Credentials Modal for LINE */}
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
                  Channel Access Token (Long-Lived){' '}
                  <span className="text-slate-400 font-normal">(Dari Messaging API tab)</span>
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
