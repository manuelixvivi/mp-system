'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { getWibParts, WibDateTimeParts } from '@/lib/time';

interface ServerTimeContextType {
  serverTime: Date;
  wibTimeStr: string;
  wibIsoDate: string;
  wibDay: number;
  wibMonth: number;
  wibYear: number;
  isSynced: boolean;
  syncTime: () => Promise<void>;
}

const ServerTimeContext = createContext<ServerTimeContextType | undefined>(undefined);

export function ServerTimeProvider({ children }: { children: React.ReactNode }) {
  const [serverTime, setServerTime] = useState<Date>(new Date());
  const [wibParts, setWibParts] = useState<WibDateTimeParts>(() => getWibParts(new Date()));
  const [isSynced, setIsSynced] = useState<boolean>(false);

  // Offset in milliseconds: serverEpoch - localEpoch
  const offsetRef = useRef<number>(0);
  const lastTickLocalRef = useRef<number>(Date.now());
  const isSyncingRef = useRef<boolean>(false);

  const syncTime = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    try {
      const t0 = Date.now();
      const res = await fetch('/api/time', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch server time: ${res.status}`);
      }

      const data = await res.json();
      const t1 = Date.now();
      const rtt = Math.max(0, t1 - t0);
      const estimatedServerEpoch = data.timestamp + Math.round(rtt / 2);
      const calculatedOffset = estimatedServerEpoch - t1;

      offsetRef.current = calculatedOffset;
      lastTickLocalRef.current = t1;

      const syncedServerDate = new Date(estimatedServerEpoch);
      setServerTime(syncedServerDate);
      setWibParts(getWibParts(syncedServerDate));
      setIsSynced(true);
    } catch (err) {
      console.warn('[SERVER TIME] Sync error:', err);
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  // Initial sync & periodic resync every 60 seconds
  useEffect(() => {
    syncTime();

    const periodicSync = setInterval(() => {
      syncTime();
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncTime();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(periodicSync);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncTime]);

  // Clock tick interval (every 1 second)
  useEffect(() => {
    const tickInterval = setInterval(() => {
      const currentLocal = Date.now();
      const elapsed = currentLocal - lastTickLocalRef.current;

      // Detection of system clock tampering or sleep/wake:
      // If time jumped forward or backward by more than 3 seconds
      if (Math.abs(elapsed - 1000) > 3000) {
        console.warn('[SERVER TIME] Detected clock jump / tampering. Re-syncing with server...');
        lastTickLocalRef.current = currentLocal;
        syncTime();
        return;
      }

      lastTickLocalRef.current = currentLocal;
      const currentServerEpoch = currentLocal + offsetRef.current;
      const currentServerDate = new Date(currentServerEpoch);

      setServerTime(currentServerDate);
      setWibParts(getWibParts(currentServerDate));
    }, 1000);

    return () => clearInterval(tickInterval);
  }, [syncTime]);

  return (
    <ServerTimeContext.Provider
      value={{
        serverTime,
        wibTimeStr: wibParts.timeStr,
        wibIsoDate: wibParts.isoDate,
        wibDay: wibParts.day,
        wibMonth: wibParts.month,
        wibYear: wibParts.year,
        isSynced,
        syncTime,
      }}
    >
      {children}
    </ServerTimeContext.Provider>
  );
}

export function useServerTime(): ServerTimeContextType {
  const context = useContext(ServerTimeContext);
  if (!context) {
    throw new Error('useServerTime must be used within a ServerTimeProvider');
  }
  return context;
}
