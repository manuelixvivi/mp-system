'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, Profile } from '@/types';

interface RoleContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  currentUser: Profile;
  switchUser: (role: UserRole) => void;
}

const DEFAULT_USERS: Record<UserRole, Profile> = {
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
  const [currentRole, setCurrentRole] = useState<UserRole>('superadmin');
  const [currentUser, setCurrentUser] = useState<Profile>(DEFAULT_USERS.superadmin);

  useEffect(() => {
    const savedRole = localStorage.getItem('mp_active_role') as UserRole;
    if (savedRole && DEFAULT_USERS[savedRole]) {
      setCurrentRole(savedRole);
      setCurrentUser(DEFAULT_USERS[savedRole]);
    }
  }, []);

  const switchUser = (role: UserRole) => {
    setCurrentRole(role);
    setCurrentUser(DEFAULT_USERS[role]);
    localStorage.setItem('mp_active_role', role);
  };

  return (
    <RoleContext.Provider value={{ currentRole, setCurrentRole: switchUser, currentUser, switchUser }}>
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
