'use client';

import React, { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { SafeProfile } from '@/types';
import {
  ShieldCheck,
  UserPlus,
  Shield,
  BookOpen,
  Package,
  AtSign,
  CheckCircle,
  AlertTriangle,
  Lock,
} from 'lucide-react';

export default function UserManagementPage() {
  const { currentRole } = useRole();
  const [users, setUsers] = useState<SafeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'superadmin' | 'liturgi' | 'logistik'>('liturgi');
  const [lineUserId, setLineUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentRole === 'superadmin') {
      loadUsers();
    }
  }, [currentRole]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          role,
          line_user_id: lineUserId,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menambahkan akun.');
      }

      setShowAddModal(false);
      setName('');
      setEmail('');
      setPassword('');
      setLineUserId('');
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (currentRole !== 'superadmin') {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center max-w-lg mx-auto mt-12 space-y-3">
        <Shield className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Akses Dibatasi Khusus Superadmin</h2>
        <p className="text-xs text-slate-500">
          Halaman User Management hanya dapat diakses oleh Superadmin untuk mengelola akun dashboard dan penautan LINE User ID.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full font-medium inline-flex mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Role-Based Access Control (RBAC) • Superadmin Only</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">User Management & Hak Akses</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola profil dashboard untuk Tim Liturgi dan Logistik, serta tautkan LINE User ID untuk otorisasi perintah bot.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Akun Petugas</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Nama Petugas</th>
                <th className="px-5 py-3">Email Pengguna</th>
                <th className="px-5 py-3">Role & Kewenangan</th>
                <th className="px-5 py-3">LINE User ID Terhubung</th>
                <th className="px-5 py-3">Status Akun</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-slate-900">{u.name}</td>
                  <td className="px-5 py-3.5 text-slate-600 font-mono text-[11px]">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                        u.role === 'superadmin'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : u.role === 'liturgi'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {u.role === 'superadmin' && <Shield className="w-3 h-3" />}
                      {u.role === 'liturgi' && <BookOpen className="w-3 h-3" />}
                      {u.role === 'logistik' && <Package className="w-3 h-3" />}
                      <span className="capitalize">{u.role}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {u.line_user_id ? (
                      <div className="flex items-center space-x-1 font-mono text-[11px] text-slate-800">
                        <AtSign className="w-3 h-3 text-emerald-600" />
                        <span>{u.line_user_id}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Belum ditautkan</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full text-[10px] border border-emerald-200">
                      Aktif
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Tambah Akun Petugas Baru</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            {error && (
              <div className="mt-3 p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleAddUser} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Yohanes Surya"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="surya@mpcommunity.org"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password Awal *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Password akan otomatis di-hash menggunakan algoritma Bcrypt (10 salt rounds).
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role Petugas *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                >
                  <option value="liturgi">Tim Liturgi (Pengelolaan & Audit Renungan)</option>
                  <option value="logistik">Tim Logistik (Pengelolaan Data Ulang Tahun)</option>
                  <option value="superadmin">Superadmin (Akses Penuh Seluruh Sistem)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  LINE User ID (Opsional — untuk perintah bot)
                </label>
                <input
                  type="text"
                  value={lineUserId}
                  onChange={(e) => setLineUserId(e.target.value)}
                  placeholder="Contoh: U987654321..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 shadow-sm"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
