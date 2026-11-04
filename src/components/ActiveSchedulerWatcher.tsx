'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useServerTime } from '@/context/ServerTimeContext';
import { useRole } from '@/context/RoleContext';
import { BellRing, CheckCircle2, Clock } from 'lucide-react';

interface AutomationSettingsState {
  birthday_broadcast_time: string;
  birthday_automation_active: boolean;
  devotional_broadcast_time: string;
  devotional_automation_active: boolean;
}

export default function ActiveSchedulerWatcher() {
  const { wibTimeStr, wibIsoDate } = useServerTime();
  const { currentRole } = useRole();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const settingsRef = useRef<AutomationSettingsState | null>(null);
  const isExecutingRef = useRef<{ [key: string]: boolean }>({});

  // 1. Periodically fetch latest automation settings from DB
  const refreshSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          settingsRef.current = {
            birthday_broadcast_time: data.settings.birthday_broadcast_time || '07:00',
            birthday_automation_active: Boolean(data.settings.birthday_automation_active),
            devotional_broadcast_time: data.settings.devotional_broadcast_time || '09:45',
            devotional_automation_active: Boolean(data.settings.devotional_automation_active),
          };
        }
      }
    } catch (e) {
      // Background poll fail gracefully
    }
  };

  useEffect(() => {
    refreshSettings();
    const interval = setInterval(refreshSettings, 30000); // sync settings every 30s
    return () => clearInterval(interval);
  }, []);

  // 2. Watch clock ticks
  useEffect(() => {
    if (!wibTimeStr || !wibIsoDate) return;
    const currentHHmm = wibTimeStr.slice(0, 5); // e.g. "13:18"
    const currentSeconds = parseInt(wibTimeStr.slice(6, 8) || '0', 10);
    const settings = settingsRef.current;
    if (!settings) return;

    // Check Birthday Broadcast
    if (
      settings.birthday_automation_active &&
      settings.birthday_broadcast_time === currentHHmm &&
      currentSeconds <= 15
    ) {
      const lockKey = `bday_${wibIsoDate}_${currentHHmm}`;
      const storageKey = `bday_auto_delivered_${wibIsoDate}`;

      if (!isExecutingRef.current[lockKey] && typeof window !== 'undefined') {
        const alreadyDone = localStorage.getItem(storageKey);
        if (!alreadyDone) {
          isExecutingRef.current[lockKey] = true;
          localStorage.setItem(storageKey, 'pending');

          fetch('/api/cron/birthday-broadcast', { method: 'POST' })
            .then(async (res) => {
              const result = await res.json();
              if (res.ok && result.success !== false) {
                localStorage.setItem(storageKey, 'success');
                setToastMessage(
                  `🎉 [Jadwal Otomatis ${currentHHmm} WIB] Siaran ucapan ulang tahun berhasil dikirimkan ke grup LINE!`
                );
                setTimeout(() => setToastMessage(null), 8000);
              } else {
                localStorage.removeItem(storageKey);
                console.warn('[SCHEDULER WATCHER] Birthday broadcast skipped or failed:', result);
              }
            })
            .catch((err) => {
              localStorage.removeItem(storageKey);
              console.error('[SCHEDULER WATCHER] Network trigger error:', err);
            })
            .finally(() => {
              isExecutingRef.current[lockKey] = false;
            });
        }
      }
    }

    // Check Devotional Broadcast
    if (
      settings.devotional_automation_active &&
      settings.devotional_broadcast_time === currentHHmm &&
      currentSeconds <= 15
    ) {
      const lockKey = `devo_${wibIsoDate}_${currentHHmm}`;
      const storageKey = `devo_auto_delivered_${wibIsoDate}`;

      if (!isExecutingRef.current[lockKey] && typeof window !== 'undefined') {
        const alreadyDone = localStorage.getItem(storageKey);
        if (!alreadyDone) {
          isExecutingRef.current[lockKey] = true;
          localStorage.setItem(storageKey, 'pending');

          fetch('/api/cron/devotional-broadcast', { method: 'POST' })
            .then(async (res) => {
              const result = await res.json();
              if (res.ok && result.success !== false) {
                localStorage.setItem(storageKey, 'success');
                setToastMessage(
                  `📖 [Jadwal Otomatis ${currentHHmm} WIB] Siaran renungan harian berhasil dikirimkan ke grup LINE!`
                );
                setTimeout(() => setToastMessage(null), 8000);
              } else {
                localStorage.removeItem(storageKey);
                console.warn('[SCHEDULER WATCHER] Devotional broadcast skipped or failed:', result);
              }
            })
            .catch((err) => {
              localStorage.removeItem(storageKey);
              console.error('[SCHEDULER WATCHER] Network trigger error:', err);
            })
            .finally(() => {
              isExecutingRef.current[lockKey] = false;
            });
        }
      }
    }
  }, [wibTimeStr, wibIsoDate]);

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce duration-500">
      <div className="bg-slate-900 text-white border border-emerald-500/50 shadow-2xl rounded-2xl p-4 flex items-center space-x-3 max-w-md">
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="flex-1 text-xs">
          <p className="font-bold text-emerald-400 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Eksekusi Otomatis Berhasil</span>
          </p>
          <p className="text-slate-200 mt-0.5 leading-relaxed">{toastMessage}</p>
        </div>
      </div>
    </div>
  );
}
