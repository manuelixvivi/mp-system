'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Lock,
  Mail,
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Package,
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Harap masukkan email dan password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Autentikasi gagal.');
      }

      // Successful login -> Redirect to returnUrl
      router.push(returnUrl);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat masuk.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setError(null);
  };

  return (
    <div className="w-full max-w-md space-y-6 relative z-10">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-400 text-white font-bold text-2xl shadow-xl shadow-emerald-950/50 mb-2">
          MP
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">MP Control System</h1>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Pusat Kendali Komunikasi Komunitas MP • Daily Devotional & Birthday Automation
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="pb-3 border-b border-slate-800">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Autentikasi Akun Petugas</span>
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Masukkan kredensial yang terdaftar untuk mengakses dashboard.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-200 flex items-center space-x-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Email Pengguna
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@mpcommunity.org"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-all shadow-lg shadow-emerald-950 flex items-center justify-center space-x-2 active:scale-98"
          >
            <span>{loading ? 'Memvalidasi...' : 'Masuk ke Dashboard'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Quick Credential Helper for Initial Access */}
        <div className="pt-3 border-t border-slate-800 space-y-2">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
            Pilih Akun Terdaftar (Klik untuk Isi Cepat):
          </span>
          <div className="grid grid-cols-1 gap-1.5 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => fillCredentials('superadmin@mpcommunity.org', 'SuperAdminMP2026!')}
              className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 text-left flex items-center justify-between text-slate-300 hover:text-white transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                <span>Superadmin (Akses Penuh)</span>
              </div>
              <span className="text-[10px] text-purple-400 font-sans">Klik Isi</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials('liturgi@mpcommunity.org', 'LiturgiMP2026!')}
              className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 text-left flex items-center justify-between text-slate-300 hover:text-white transition-colors"
            >
              <div className="flex items-center space-x-2">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Tim Liturgi (Renungan)</span>
              </div>
              <span className="text-[10px] text-amber-400 font-sans">Klik Isi</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials('logistik@mpcommunity.org', 'LogistikMP2026!')}
              className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-blue-500/50 text-left flex items-center justify-between text-slate-300 hover:text-white transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Package className="w-3.5 h-3.5 text-blue-400" />
                <span>Tim Logistik (Ulang Tahun)</span>
              </div>
              <span className="text-[10px] text-blue-400 font-sans">Klik Isi</span>
            </button>
          </div>
        </div>
      </div>

      {/* Security Footer Info */}
      <div className="text-center text-[10px] text-slate-500 flex items-center justify-center space-x-1.5">
        <Shield className="w-3 h-3 text-emerald-500" />
        <span>Password di-hash dengan Bcrypt (10 Salt Rounds) • Sesi httpOnly Cookie Terenkripsi</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <Suspense fallback={<div className="text-white text-xs font-mono">Memuat sistem autentikasi...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
