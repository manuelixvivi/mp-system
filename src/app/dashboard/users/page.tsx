'use client';

import React, { useState } from 'react';
import { useRole } from '@/context/RoleContext';
import {
  ShieldCheck,
  UserPlus,
  Shield,
  BookOpen,
  Package,
  AtSign,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

export default function UserManagementPage() {
  const { currentRole } = useRole();
  const [users, setUsers] = useState([
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Fr. Michael Tan',
      email: 'superadmin@mpcommunity.org',
      role: 'superadmin',
      lineUserId: 'U_SUPERADMIN_001',
      isActive: true,
      lastActive: 'Hari ini, 20:15 WIB',
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Sr. Clara Bernadeth',
      email: 'liturgi@mpcommunity.org',
      role: 'liturgi',
      lineUserId: 'U_LITURGI_002',
      isActive: true,
      lastActive: 'Hari ini, 08:30 WIB',
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Antonius Budi',
      email: 'logistik@mpcommunity.org',
      role: 'logistik',
      lineUserId: 'U_LOGISTIK_003',
      isActive: true,
      lastActive: 'Kemarin, 19:40 WIB',
    },
  ]);

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
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Nama & Email</th>
                <th className="px-5 py-3">Role & Tanggung Jawab</th>
                <th className="px-5 py-3">LINE User ID Terhubung</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Aktivitas Terakhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-slate-900">{u.name}</p>
                    <p className="text-[11px] text-slate-400">{u.email}</p>
                  </td>
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
                    <div className="flex items-center space-x-1 font-mono text-[11px] text-slate-800">
                      <AtSign className="w-3 h-3 text-emerald-600" />
                      <span>{u.lineUserId}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full text-[10px] border border-emerald-200">
                      Aktif
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{u.lastActive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
