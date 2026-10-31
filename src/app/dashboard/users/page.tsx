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
  Search,
  Trash2,
  Users,
} from 'lucide-react';

export default function UserManagementPage() {
  const { currentRole, currentUser } = useRole();
  const [users, setUsers] = useState<SafeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'superadmin' | 'liturgi' | 'logistik'>('liturgi');
  const [lineUserId, setLineUserId] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error('Error fetching users:', e);
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
    setSubmitting(true);

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
      setSuccessMessage(`Akun ${data.user?.name} (${data.user?.role}) berhasil didaftarkan. Pengguna dapat langsung login dengan email dan password tersebut.`);
      loadUsers();
      setTimeout(() => setSuccessMessage(null), 7000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userToDelete: SafeProfile) => {
    if (userToDelete.id === currentUser?.id) {
      alert('Anda tidak dapat menghapus akun Anda sendiri.');
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus akun ${userToDelete.name} (${userToDelete.email})? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users?id=${userToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus akun');
      }

      setSuccessMessage(`Akun ${userToDelete.name} berhasil dihapus.`);
      loadUsers();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (currentRole !== 'superadmin') {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center max-w-lg mx-auto mt-12 space-y-3">
        <Shield className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Akses Dibatasi Khusus Superadmin</h2>
        <p className="text-xs text-slate-500">
          Halaman User Management hanya dapat diakses oleh Superadmin untuk mendaftarkan akun petugas dan mengelola hak akses.
        </p>
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      (u.line_user_id && u.line_user_id.toLowerCase().includes(q))
    );
  });

  const superadminCount = users.filter((u) => u.role === 'superadmin').length;
  const liturgiCount = users.filter((u) => u.role === 'liturgi').length;
  const logistikCount = users.filter((u) => u.role === 'logistik').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full font-medium inline-flex mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Role-Based Access Control (RBAC) • Superadmin Authority</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">User Management & Pendaftaran Akun</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftarkan dan tentukan hak akses petugas MP Control System (Superadmin, Tim Liturgi, Tim Logistik).
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setShowAddModal(true);
          }}
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Daftarkan Akun Petugas Baru</span>
        </button>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-start space-x-3 text-xs animate-in fade-in duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{successMessage}</div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-500 hover:text-emerald-800 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Petugas</p>
            <p className="text-xl font-bold text-slate-900">{users.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-700">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">Superadmin</p>
            <p className="text-xl font-bold text-slate-900">{superadminCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Tim Liturgi</p>
            <p className="text-xl font-bold text-slate-900">{liturgiCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Tim Logistik</p>
            <p className="text-xl font-bold text-slate-900">{logistikCount}</p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama, email, atau role..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>
        <p className="text-xs text-slate-500">
          Menampilkan <span className="font-semibold text-slate-800">{filteredUsers.length}</span> dari {users.length} akun terdaftar
        </p>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Nama Petugas</th>
                <th className="px-5 py-3">Email Pengguna</th>
                <th className="px-5 py-3">Role & Hak Akses</th>
                <th className="px-5 py-3">LINE User ID</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                    Memuat daftar akun...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                    Tidak ada akun yang sesuai dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      {u.id === currentUser?.id && (
                        <span className="text-[10px] text-emerald-600 font-semibold">
                          (Akun Anda saat ini)
                        </span>
                      )}
                    </td>
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
                    <td className="px-5 py-3.5 text-right">
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus Akun"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Daftarkan Akun Petugas Baru</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            {error && (
              <div className="mt-3 p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAddUser} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap Petugas *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Stefanus Bagus"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Login *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="bagus@mpcommunity.org"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Email ini digunakan petugas untuk masuk ke dashboard MP Control System.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role / Hak Akses *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="liturgi">Tim Liturgi — Pengelolaan & Audit Renungan (00:00–09:45 WIB)</option>
                  <option value="logistik">Tim Logistik — Pengelolaan Anggota & Kalender Ulang Tahun</option>
                  <option value="superadmin">Superadmin — Akses Penuh Sistem & User Management</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password Awal *</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Password di-hash menggunakan algoritma Bcrypt (10 salt rounds) dan tidak tersimpan plaintext.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  LINE User ID (Opsional — untuk integrasi personal chat bot)
                </label>
                <input
                  type="text"
                  value={lineUserId}
                  onChange={(e) => setLineUserId(e.target.value)}
                  placeholder="Contoh: U782390492104..."
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
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan & Daftarkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
