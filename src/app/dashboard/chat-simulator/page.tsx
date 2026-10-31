'use client';

import React, { useState } from 'react';
import { useRole } from '@/context/RoleContext';
import {
  Bot,
  Send,
  User,
  ShieldCheck,
  RefreshCw,
  Terminal,
  Info,
  Sparkles,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

export default function ChatSimulatorPage() {
  const { currentRole, currentUser } = useRole();
  const [selectedPersona, setSelectedPersona] = useState<string>('superadmin');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'bot',
      text: `Selamat datang di MP Control Bot Simulator! 🤖\n\nKetik /help untuk panduan atau /menu untuk membuka menu sesuai wewenang role Anda.`,
      timestamp: 'Baru saja',
    },
  ]);

  const personas = [
    {
      key: 'superadmin',
      name: 'Fr. Michael Tan (Superadmin)',
      lineUserId: 'U_SUPERADMIN_001',
      role: 'Superadmin (Akses Penuh)',
      badge: 'bg-purple-100 text-purple-700',
    },
    {
      key: 'liturgi',
      name: 'Sr. Clara Bernadeth (Tim Liturgi)',
      lineUserId: 'U_LITURGI_002',
      role: 'Liturgi (Devotional Saja)',
      badge: 'bg-amber-100 text-amber-700',
    },
    {
      key: 'logistik',
      name: 'Antonius Budi (Tim Logistik)',
      lineUserId: 'U_LOGISTIK_003',
      role: 'Logistik (Birthday Saja)',
      badge: 'bg-blue-100 text-blue-700',
    },
    {
      key: 'unregistered',
      name: 'Akun Belum Terdaftar (Orang Luar)',
      lineUserId: 'U_UNREGISTERED_999',
      role: 'Tidak Terdaftar (Ditolak)',
      badge: 'bg-red-100 text-red-700',
    },
  ];

  const currentPersona = personas.find((p) => p.key === selectedPersona) || personas[0];

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentPersona.lineUserId,
          text,
        }),
      });

      const data = await res.json();
      const botReply = data.botReply || 'Pesan diproses.';

      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: botReply,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot_err_${Date.now()}`,
          sender: 'bot',
          text: `Error: ${err.message}`,
          timestamp: 'Baru saja',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickCommands = [
    { label: '/menu', desc: 'Buka menu wewenang' },
    { label: '/status', desc: 'Cek status harian' },
    { label: '/help', desc: 'Daftar perintah' },
    { label: '/broadcast devotional', desc: 'Siarkan renungan' },
    { label: '/broadcast birthday', desc: 'Siarkan ulang tahun' },
    { label: '/approve', desc: 'Setujui renungan' },
    { label: '/confirm', desc: 'Konfirmasi kirim' },
    { label: '/batal', desc: 'Batal kirim' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-medium inline-flex mb-2">
            <Bot className="w-3.5 h-3.5" />
            <span>Dual-Channel Control • Jalur Personal Chat LINE</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">LINE Personal Chat Simulator</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Uji interaksi command-based personal chat LINE bot secara langsung dengan validasi otentikasi LINE User ID dan hak akses RBAC.
          </p>
        </div>

        {/* Persona Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Pilih Akun LINE Pengirim:</span>
          <select
            value={selectedPersona}
            onChange={(e) => {
              setSelectedPersona(e.target.value);
              setMessages([
                {
                  id: `welcome_${Date.now()}`,
                  sender: 'bot',
                  text: `Beralih ke akun LINE: ${e.target.options[e.target.selectedIndex].text}.\nKetik /menu untuk melihat wewenang akun ini.`,
                  timestamp: 'Baru saja',
                },
              ]);
            }}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none font-medium"
          >
            {personas.map((p) => (
              <option key={p.key} value={p.key}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Interactive Phone Chat View */}
        <div className="lg:col-span-8 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[640px]">
          {/* Chat Header Bar */}
          <div className="bg-slate-800 px-5 py-3.5 border-b border-slate-700 flex items-center justify-between text-white">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-white shadow-sm">
                MP
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">MP Control Bot</p>
                <p className="text-[11px] text-emerald-400 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                  <span>Personal 1-on-1 Chat • Broadcast-Only in Groups</span>
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${currentPersona.badge}`}>
                {currentPersona.name.split(' ')[0]} ({currentPersona.lineUserId})
              </span>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/60">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none shadow-sm'
                      : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700/80 shadow-md font-sans'
                  }`}
                >
                  <p>{msg.text}</p>
                  <span
                    className={`text-[9px] mt-1.5 block text-right ${
                      msg.sender === 'user' ? 'text-emerald-200' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 text-slate-400 px-4 py-2.5 rounded-2xl text-xs rounded-bl-none flex items-center space-x-2">
                  <span className="animate-spin text-emerald-400">●</span>
                  <span>MP Control Bot sedang mengetik...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-slate-800 border-t border-slate-700 flex items-center space-x-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder="Ketik command, misal /menu atau /status..."
              className="flex-1 bg-slate-900 text-white placeholder-slate-500 text-xs px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500 font-mono"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={loading || !inputText.trim()}
              className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition-all shadow-md active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Column (4 cols): Command Cheatsheet & RBAC Rules */}
        <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
          {/* Quick Click Commands */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-600" />
              <span>Daftar Command Cepat (Klik untuk Kirim)</span>
            </h3>

            <div className="grid grid-cols-1 gap-1.5 mt-3">
              {quickCommands.map((cmd) => (
                <button
                  key={cmd.label}
                  onClick={() => handleSendMessage(cmd.label)}
                  className="flex items-center justify-between p-2 rounded-lg border border-slate-200/80 hover:bg-slate-50 text-left transition-colors text-xs"
                >
                  <span className="font-mono font-semibold text-emerald-700">{cmd.label}</span>
                  <span className="text-[11px] text-slate-400">{cmd.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* PRD Policy Reference Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <p className="font-bold text-slate-900 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Aturan Interaksi Bot (PRD 3.3 & 3.4)</span>
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed text-slate-500">
              <li>
                <strong>Verifikasi LINE User ID:</strong> Bot hanya melayani pesan dari ID yang telah terdaftar di dashboard.
              </li>
              <li>
                <strong>RBAC:</strong> Liturgi hanya dapat mengontrol renungan; Logistik hanya dapat mengontrol ultah; Superadmin keduanya.
              </li>
              <li>
                <strong>Konfirmasi Wajib:</strong> Perintah broadcast meminta ketikan <code>/confirm</code> sebelum dikirim.
              </li>
              <li>
                <strong>Broadcast-Only di Grup:</strong> Bot mengabaikan semua percakapan di grup LINE.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
