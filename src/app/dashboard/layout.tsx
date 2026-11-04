'use client';

import React from 'react';
import { RoleProvider } from '@/context/RoleContext';
import { ServerTimeProvider } from '@/context/ServerTimeContext';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import ActiveSchedulerWatcher from '@/components/ActiveSchedulerWatcher';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ServerTimeProvider>
      <RoleProvider>
        <div className="flex min-h-screen bg-slate-50">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Topbar />
            <main className="flex-1 p-6 overflow-y-auto">{children}</main>
          </div>
        </div>
        <ActiveSchedulerWatcher />
      </RoleProvider>
    </ServerTimeProvider>
  );
}
