'use client';

import React, { useState, useEffect } from 'react';
import { useRole } from '@/context/RoleContext';
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
  LogOut,
} from 'lucide-react';

export default function Topbar() {
  const { currentRole, currentUser, logout, loading } = useRole();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now);
      setCurrentTime(timeStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

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

        {/* Live WIB Clock */}
        <div className="flex items-center space-x-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono font-medium text-slate-700">{currentTime || '00:00:00'}</span>
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

          {/* Logout Button */}
          <button
            onClick={handleLogoutClick}
            disabled={loggingOut}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
            title="Keluar (Logout)"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
