'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole, SafeProfile } from '@/types';

interface RoleContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  currentUser: SafeProfile;
  switchUser: (role: UserRole) => void;
  logout: () => Promise<void>;
  loading: boolean;
}

const DEFAULT_USERS: Record<UserRole, SafeProfile> = {
  superadmin: {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'superadmin@mpcommunity.org',
    name: 'Fr. Michael Tan (Superadmin)',
    role: 'superadmin',
    line_user_id: 'U_SUPERADMIN_001',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  liturgi: {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'liturgi@mpcommunity.org',
    name: 'Sr. Clara Bernadeth (Tim Liturgi)',
    role: 'liturgi',
    line_user_id: 'U_LITURGI_002',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  logistik: {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'logistik@mpcommunity.org',
    name: 'Antonius Budi (Tim Logistik)',
    role: 'logistik',
    line_user_id: 'U_LOGISTIK_003',
    is_active: true,
    created_at: new Date().toISOString(),
  },
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [currentRole, setCurrentRole] = useState<UserRole>('superadmin');
  const [currentUser, setCurrentUser] = useState<SafeProfile>(DEFAULT_USERS.superadmin);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch authenticated user from session
    async function loadAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
            setCurrentRole(data.user.role);
          }
        }
      } catch (err) {
        // Fallback
      } finally {
        setLoading(false);
      }
    }

    loadAuth();
  }, []);

  const switchUser = (role: UserRole) => {
    setCurrentRole(role);
    setCurrentUser(DEFAULT_USERS[role]);
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <RoleContext.Provider
      value={{
        currentRole,
        setCurrentRole: switchUser,
        currentUser,
        switchUser,
        logout,
        loading,
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
