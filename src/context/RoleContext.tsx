'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole, SafeProfile } from '@/types';

interface RoleContextType {
  currentRole: UserRole;
  currentUser: SafeProfile;
  logout: () => Promise<void>;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

// Fallback skeleton while session loads
const GUEST_PROFILE: SafeProfile = {
  id: '',
  email: '',
  name: 'Memuat...',
  role: 'liturgi',
  is_active: false,
  created_at: '',
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SafeProfile>(GUEST_PROFILE);
  const [currentRole, setCurrentRole] = useState<UserRole>('liturgi');
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!res.ok) {
        // Not authenticated -> redirect to login
        router.push('/login');
        return;
      }

      const data = await res.json();
      if (data?.user?.email && data?.user?.role) {
        // Role is strictly derived from the authenticated database profile
        setCurrentUser(data.user);
        setCurrentRole(data.user.role);
      } else {
        router.push('/login');
      }
    } catch (err) {
      console.error('Session load failed:', err);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setCurrentUser(GUEST_PROFILE);
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <RoleContext.Provider
      value={{
        currentRole,
        currentUser,
        logout,
        loading,
        refreshUser: fetchSession,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
