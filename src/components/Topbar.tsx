'use client';

import React, { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
import { useServerTime } from '@/context/ServerTimeContext';
import { UserRole } from '@/types';
import {
  Bell,
  Clock,
  Radio,
  CheckCircle2,
  ChevronDown,
  Shield,
  BookOpen,
  Package,
  Palette,
  LogOut,
  Key,
  Lock,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';

export default function Topbar() {
  const { currentRole, currentUser, logout, loading } = useRole();
  const { wibTimeStr, isSynced } = useServerTime();
  const [showNotifications, setShowNotifications] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Self Password Change Modal States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [myNewPassword, setMyNewPassword] = useState('');
  const [myConfirmPassword, setMyConfirmPassword] = useState('');
  const [showMyPassword, setShowMyPassword] = useState(false);
  const [isSavingMyPassword, setIsSavingMyPassword] = useState(false);
  const [myPasswordError, setMyPasswordError] = useState<string | null>(null);
  const [myPasswordSuccess, setMyPasswordSuccess] = useState<string | null>(null);

  const handleSaveMyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMyPasswordError(null);
    setMyPasswordSuccess(null);

    if (!myNewPassword || myNewPassword.length < 6) {
      setMyPasswordError('Password baru harus minimal 6 karakter.');
      return;
    }

    if (myNewPassword !== myConfirmPassword) {
      setMyPasswordError('Konfirmasi password tidak cocok.');
      return;
    }

    if (!currentUser?.id) return;

    setIsSavingMyPassword(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          userId: currentUser.id,
          newPassword: myNewPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengubah password.');
      }

      setMyPasswordSuccess('Password akun Anda berhasil diperbarui!');
      setTimeout(() => {
        setShowPasswordModal(false);
        setMyPasswordSuccess(null);
      }, 2000);
    } catch (err: any) {
      setMyPasswordError(err.message);
    } finally {
      setIsSavingMyPassword(false);
    }
  };

  const roleConfigs: Record<UserRole, { title: string; badgeColor: string; icon: any }> = {
    superadmin: {
      title: 'Superadmin',
      badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
      icon: Shield,
    },
    liturgi: {
      title: 'Tim Liturgi',
      badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
      icon: BookOpen,
    },
    logistik: {
      title: 'Tim Logistik',
      badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: Package,
    },
    pubdok: {
      title: 'Tim Pubdok',
      badgeColor: 'bg-rose-100 text-rose-700 border-rose-200',
      icon: Palette,
    },
  };

  const CurrentRoleIcon = roleConfigs[currentRole]?.icon || Shield;

  const handleLogoutClick = async () => {
    setLoggingOut(true);
    await logout();
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: System Status & Timezone */}
      <div className="flex items-center space-x-4">
        {/* LINE Bot Status Badge */}
        <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
          </span>
          <span className="text-xs font-semibold text-emerald-800">LINE Bot: Connected</span>
        </div>

        {/* Live WIB Clock (Synchronized to Server Time) */}
        <div
          className="flex items-center space-x-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/50"
          title={isSynced ? 'Jam Server Terverifikasi (WIB)' : 'Menyinkronkan jam server...'}
        >
          <Clock className={`w-3.5 h-3.5 ${isSynced ? 'text-slate-400' : 'text-amber-500 animate-spin'}`} />
          <span className="font-mono font-medium text-slate-700">{wibTimeStr || '--:--:--'}</span>
          <span className="text-[10px] text-slate-400 font-medium">WIB</span>
        </div>
      </div>

      {/* Right: Notifications & User Profile */}
      <div className="flex items-center space-x-4">
        {/* Notifications Icon */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg relative transition-colors"
            title="Notifikasi"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">Notifikasi Terkini</span>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                  3 Baru
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                <div className="p-3 hover:bg-slate-50 text-xs cursor-pointer">
                  <p className="font-medium text-slate-800">Renungan Siap Diaudit</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Coffee Break with God hari ini selesai diproses.
                  </p>
                </div>
                <div className="p-3 hover:bg-slate-50 text-xs cursor-pointer">
                  <p className="font-medium text-slate-800">3 Ulang Tahun Hari Ini</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Ucapan otomatis dengan LINE mention telah terkirim pukul 07:00 WIB.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Card */}
        <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
            {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-slate-800 leading-tight">
              {currentUser?.name || (loading ? 'Memuat profil...' : 'Tamu')}
            </p>
            <span
              className={`inline-flex items-center space-x-1 text-[10px] px-1.5 py-0.2 rounded border font-medium ${
                roleConfigs[currentRole]?.badgeColor || 'bg-slate-100 text-slate-600'
              }`}
            >
              <CurrentRoleIcon className="w-2.5 h-2.5" />
              <span>{roleConfigs[currentRole]?.title || currentRole}</span>
            </span>
          </div>

          {/* Change Own Password Button */}
          {currentUser?.id && (
            <button
              onClick={() => {
                setMyNewPassword('');
                setMyConfirmPassword('');
                setMyPasswordError(null);
                setMyPasswordSuccess(null);
                setShowMyPassword(false);
                setShowPasswordModal(true);
              }}
              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors ml-1"
              title="Ganti Password Akun Saya"
            >
              <Key className="w-4 h-4" />
            </button>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogoutClick}
            disabled={loggingOut}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Keluar (Logout)"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Change Password Modal for Current User */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Ganti Password Saya</h3>
                  <p className="text-[11px] text-slate-500 font-mono truncate max-w-[200px]">
                    {currentUser?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-base"
              >
                &times;
              </button>
            </div>

            {myPasswordSuccess && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{myPasswordSuccess}</span>
              </div>
            )}

            {myPasswordError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                {myPasswordError}
              </div>
            )}

            <form onSubmit={handleSaveMyPassword} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password Baru *</label>
                <div className="relative">
                  <input
                    type={showMyPassword ? 'text' : 'password'}
                    required
                    value={myNewPassword}
                    onChange={(e) => setMyNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-3 pr-9 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMyPassword(!showMyPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showMyPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Konfirmasi Password *</label>
                <input
                  type={showMyPassword ? 'text' : 'password'}
                  required
                  value={myConfirmPassword}
                  onChange={(e) => setMyConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSavingMyPassword}
                  onClick={() => setShowPasswordModal(false)}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingMyPassword}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  {isSavingMyPassword ? 'Menyimpan...' : 'Perbarui Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
