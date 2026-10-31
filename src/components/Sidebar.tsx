'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '@/context/RoleContext';
import {
  LayoutDashboard,
  BookOpen,
  CheckSquare,
  Gift,
  Calendar,
  Radio,
  History,
  Bot,
  Users,
  Sliders,
  ShieldCheck,
  FileText,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { currentRole } = useRole();

  // Navigation items with role permissions
  const navItems = [
    {
      title: 'Utama',
      items: [
        {
          label: 'Overview',
          href: '/dashboard',
          icon: LayoutDashboard,
          roles: ['superadmin', 'liturgi', 'logistik'],
        },
      ],
    },
    {
      title: 'Daily Devotional',
      items: [
        {
          label: 'Manajemen Renungan',
          href: '/dashboard/devotionals',
          icon: BookOpen,
          roles: ['superadmin', 'liturgi'],
        },
        {
          label: 'Audit & Revisi Liturgi',
          href: '/dashboard/devotionals/audit',
          icon: CheckSquare,
          badge: '00:00–09:45',
          roles: ['superadmin', 'liturgi'],
        },
      ],
    },
    {
      title: 'Birthday Automation',
      items: [
        {
          label: 'Data Anggota & Ultah',
          href: '/dashboard/birthdays',
          icon: Gift,
          roles: ['superadmin', 'logistik'],
        },
        {
          label: 'Kalender Ulang Tahun',
          href: '/dashboard/birthdays/calendar',
          icon: Calendar,
          roles: ['superadmin', 'logistik'],
        },
      ],
    },
    {
      title: 'Broadcast & Delivery',
      items: [
        {
          label: 'Manual Broadcast Studio',
          href: '/dashboard/broadcast/manual',
          icon: Radio,
          badge: 'Manual',
          roles: ['superadmin', 'liturgi', 'logistik'],
        },
        {
          label: 'Riwayat Broadcast',
          href: '/dashboard/broadcast/history',
          icon: History,
          roles: ['superadmin', 'liturgi', 'logistik'],
        },
      ],
    },
    {
      title: 'Bot & Grup LINE',
      items: [
        {
          label: 'LINE Bot Management',
          href: '/dashboard/line-bots',
          icon: Bot,
          roles: ['superadmin'],
        },
        {
          label: 'Manajemen Grup LINE',
          href: '/dashboard/groups',
          icon: Users,
          roles: ['superadmin'],
        },
        {
          label: 'LINE Chat Simulator',
          href: '/dashboard/chat-simulator',
          icon: MessageSquare,
          badge: '1-on-1 Bot',
          roles: ['superadmin', 'liturgi', 'logistik'],
        },
      ],
    },
    {
      title: 'Sistem & Konfigurasi',
      items: [
        {
          label: 'Jadwal & Otomatisasi',
          href: '/dashboard/settings/automation',
          icon: Sliders,
          roles: ['superadmin'],
        },
        {
          label: 'User Management',
          href: '/dashboard/users',
          icon: ShieldCheck,
          roles: ['superadmin'],
        },
        {
          label: 'Activity Logs',
          href: '/dashboard/logs',
          icon: FileText,
          roles: ['superadmin'],
        },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 flex-shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-400 flex items-center justify-center text-white shadow-md shadow-emerald-950 font-bold text-lg">
            MP
          </div>
          <div>
            <h1 className="font-bold text-white text-base tracking-tight leading-none">
              MP Control
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">LINE Automation v1.0</p>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navItems.map((section, idx) => {
          // Filter items based on current role
          const visibleItems = section.items.filter((item) =>
            item.roles.includes(currentRole)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={idx}>
              <h2 className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                {section.title}
              </h2>
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                              isActive
                                ? 'bg-emerald-700 text-emerald-100'
                                : 'bg-slate-800 text-emerald-400 border border-emerald-900/50'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Bottom Footer Info */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Asia/Jakarta (WIB)
        </span>
        <span className="text-[10px] font-mono text-slate-400">PRD Final v1.0</span>
      </div>
    </aside>
  );
}
