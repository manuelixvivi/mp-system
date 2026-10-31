import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  Profile,
  SafeProfile,
  LineBot,
  LineGroup,
  Member,
  Devotional,
  DevotionalSource,
  AutomationSettings,
  BroadcastDelivery,
  ActivityLog,
  NotificationItem,
  BirthdayBroadcast,
  DevotionalAuditStatus,
} from '@/types';
import {
  INITIAL_PROFILES,
  INITIAL_LINE_BOT,
  INITIAL_LINE_GROUPS,
  INITIAL_MEMBERS,
  INITIAL_DEVOTIONAL,
  INITIAL_DEVOTIONAL_SOURCE,
  INITIAL_SETTINGS,
  INITIAL_DELIVERIES,
  INITIAL_LOGS,
  INITIAL_NOTIFICATIONS,
} from './mock-data';

interface DatabaseData {
  profiles: Profile[];
  line_bot: LineBot;
  line_groups: LineGroup[];
  members: Member[];
  devotionals: Devotional[];
  devotional_sources: DevotionalSource[];
  settings: AutomationSettings;
  deliveries: BroadcastDelivery[];
  birthday_broadcasts: BirthdayBroadcast[];
  logs: ActivityLog[];
  notifications: NotificationItem[];
}

const DB_FILE_PATH = process.env.VERCEL
  ? path.join('/tmp', 'mp_database.json')
  : path.join(process.cwd(), 'mp_database.json');

// In-memory cache
let inMemoryDb: DatabaseData | null = null;
let isSyncingSupabase = false;

export async function syncFromSupabase(): Promise<void> {
  if (!isSupabaseConfigured || !supabase || isSyncingSupabase) return;
  isSyncingSupabase = true;

  try {
    const [profRes, grpRes, memRes, botRes, devRes, setRes, logRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('line_groups').select('*').order('created_at', { ascending: false }),
      supabase.from('members').select('*').order('full_name', { ascending: true }),
      supabase.from('line_bots').select('*').limit(1).maybeSingle(),
      supabase.from('devotionals').select('*').order('devotional_date', { ascending: false }),
      supabase.from('automation_settings').select('*').limit(1).maybeSingle(),
      supabase.from('activity_logs').select('*').order('created_at', { ascending: false }),
    ]);

    const db = inMemoryDb || loadDatabase();
    if (!profRes.error && Array.isArray(profRes.data)) {
      db.profiles = profRes.data as Profile[];
    }
    if (!grpRes.error && Array.isArray(grpRes.data)) {
      db.line_groups = grpRes.data as LineGroup[];
    }
    if (!memRes.error && Array.isArray(memRes.data)) {
      db.members = memRes.data as Member[];
    }
    if (!botRes.error && botRes.data) {
      db.line_bot = botRes.data as LineBot;
    }
    if (!devRes.error && Array.isArray(devRes.data)) {
      db.devotionals = devRes.data as Devotional[];
    }
    if (!setRes.error && setRes.data) {
      db.settings = { ...db.settings, ...setRes.data };
    }
    if (!logRes.error && Array.isArray(logRes.data)) {
      db.logs = logRes.data as ActivityLog[];
    }
    saveDatabase(db);
  } catch (err) {
    console.error('Failed syncing from Supabase:', err);
  } finally {
    isSyncingSupabase = false;
  }
}

function loadDatabase(): DatabaseData {
  if (inMemoryDb) {
    return inMemoryDb;
  }

  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const content = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      inMemoryDb = JSON.parse(content);
      // Trigger background sync if Supabase is connected
      if (isSupabaseConfigured && supabase) {
        syncFromSupabase().catch(() => {});
      }
      return inMemoryDb!;
    }
  } catch (err) {
    console.warn('Failed reading mp_database.json, falling back to initial data:', err);
  }

  // Initialize fresh DB
  inMemoryDb = {
    profiles: [...INITIAL_PROFILES],
    line_bot: { ...INITIAL_LINE_BOT },
    line_groups: [...INITIAL_LINE_GROUPS],
    members: [...INITIAL_MEMBERS],
    devotionals: [INITIAL_DEVOTIONAL],
    devotional_sources: [INITIAL_DEVOTIONAL_SOURCE],
    settings: { ...INITIAL_SETTINGS },
    deliveries: [...INITIAL_DELIVERIES],
    birthday_broadcasts: [],
    logs: [...INITIAL_LOGS],
    notifications: [...INITIAL_NOTIFICATIONS],
  };

  saveDatabase(inMemoryDb);

  if (isSupabaseConfigured && supabase) {
    syncFromSupabase().catch(() => {});
  }

  return inMemoryDb;
}

function saveDatabase(data: DatabaseData) {
  inMemoryDb = data;
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed saving to mp_database.json:', err);
  }
}

export function sanitizeProfile(profile: Profile): SafeProfile {
  const { password_hash, ...safe } = profile;
  return safe;
}

// Profiles - Live from Supabase if configured with fallback to local store
export async function getProfiles(): Promise<SafeProfile[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const db = inMemoryDb || loadDatabase();
        db.profiles = data as Profile[];
        saveDatabase(db);
        return data.map(sanitizeProfile);
      }
    } catch (err) {
      console.warn('Supabase getProfiles warning:', err);
    }
  }
  return loadDatabase().profiles.map(sanitizeProfile);
}

export async function getProfileById(id: string): Promise<SafeProfile | undefined> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
      if (!error && data) {
        return sanitizeProfile(data);
      }
    } catch (err) {}
  }
  const profile = loadDatabase().profiles.find((p) => p.id === id);
  return profile ? sanitizeProfile(profile) : undefined;
}

export async function getProfileByEmail(email: string): Promise<SafeProfile | undefined> {
  if (!email) return undefined;
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Direct Supabase Query if configured
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: supaUser, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', normalizedEmail)
        .eq('is_active', true)
        .maybeSingle();

      if (!error && supaUser) {
        const db = inMemoryDb || loadDatabase();
        const idx = db.profiles.findIndex((p) => p.email.toLowerCase() === normalizedEmail);
        if (idx !== -1) db.profiles[idx] = supaUser;
        else db.profiles.unshift(supaUser);
        saveDatabase(db);
        return sanitizeProfile(supaUser);
      }
    } catch (err) {
      console.warn('Supabase getProfileByEmail warning, fallback to local:', err);
    }
  }

  // 2. Fallback to local DB
  const profile = loadDatabase().profiles.find(
    (p) => p.email.toLowerCase() === normalizedEmail && p.is_active
  );
  return profile ? sanitizeProfile(profile) : undefined;
}

export function getProfileByLineUserId(lineUserId: string): SafeProfile | undefined {
  const profile = loadDatabase().profiles.find((p) => p.line_user_id === lineUserId && p.is_active);
  return profile ? sanitizeProfile(profile) : undefined;
}

/**
 * Validates user credentials securely against bcrypt hash.
 * Password & Hash are NEVER logged to console or returned to callers.
 */
export async function validateUserPassword(
  email: string,
  plainPassword: string
): Promise<SafeProfile | null> {
  if (!email || !plainPassword) return null;

  const normalizedEmail = email.trim().toLowerCase();

  // 1. Direct Supabase Query if configured
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: user, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', normalizedEmail)
        .eq('is_active', true)
        .maybeSingle();

      if (!error && user && user.password_hash) {
        const isValid = await bcrypt.compare(plainPassword, user.password_hash);
        if (isValid) {
          const db = inMemoryDb || loadDatabase();
          const idx = db.profiles.findIndex((p) => p.email.toLowerCase() === normalizedEmail);
          if (idx !== -1) db.profiles[idx] = user;
          else db.profiles.push(user);
          saveDatabase(db);
          return sanitizeProfile(user);
        }
        return null;
      }
    } catch (err) {
      console.error('Supabase validateUserPassword error:', err);
    }
  }

  // 2. Fallback to local DB
  const db = loadDatabase();
  const user = db.profiles.find(
    (p) => p.email.toLowerCase() === normalizedEmail && p.is_active
  );

  if (!user || !user.password_hash) {
    return null;
  }

  try {
    const isValid = await bcrypt.compare(plainPassword, user.password_hash);
    if (!isValid) return null;
    return sanitizeProfile(user);
  } catch (err) {
    return null;
  }
}

export function generateRegistrationToken(name: string): string {
  const db = loadDatabase();
  const cleanName = (name.split(' ')[0] || 'USER')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 5) || 'TOKEN';

  let token = '';
  let attempts = 0;
  do {
    const randomDigits = Math.floor(100 + Math.random() * 900); // 3 digits, e.g. 123
    token = `${cleanName}${randomDigits}`;
    attempts++;
  } while (
    db.profiles.some((p) => p.registration_token?.toUpperCase() === token) &&
    attempts < 50
  );

  return token;
}

export async function activateProfileByToken(
  token: string,
  lineUserId: string
): Promise<{ success: boolean; profile?: SafeProfile; error?: string }> {
  if (!token || !lineUserId) {
    return { success: false, error: 'Token registrasi dan LINE User ID wajib diisi.' };
  }

  const cleanToken = token.trim().toUpperCase();

  // 1. If Supabase is connected, check and update Supabase directly
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: supaProf, error: findErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('registration_token', cleanToken)
        .maybeSingle();

      if (!findErr && supaProf) {
        // Unlink if another profile currently holds this line user ID
        await supabase
          .from('profiles')
          .update({ line_user_id: null })
          .eq('line_user_id', lineUserId);

        const { data: updated, error: updErr } = await supabase
          .from('profiles')
          .update({
            line_user_id: lineUserId,
            is_active: true,
            registration_token: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', supaProf.id)
          .select()
          .single();

        if (!updErr && updated) {
          const db = inMemoryDb || loadDatabase();
          const idx = db.profiles.findIndex((p) => p.id === supaProf.id);
          if (idx !== -1) db.profiles[idx] = updated;
          else db.profiles.push(updated);
          saveDatabase(db);

          const safe = sanitizeProfile(updated);
          addActivityLog({
            user_id: safe.id,
            user_name: safe.name,
            actor_type: 'user',
            action: 'line_account_activated',
            entity_type: 'profile',
            entity_id: safe.id,
            details: { token_used: cleanToken, line_user_id: lineUserId },
          });

          return { success: true, profile: safe };
        }
      }
    } catch (err) {
      console.error('Supabase activateProfileByToken error:', err);
    }
  }

  // 2. Fallback to local DB
  const db = loadDatabase();
  const profileIdx = db.profiles.findIndex(
    (p) => p.registration_token?.toUpperCase() === cleanToken
  );

  if (profileIdx === -1) {
    return {
      success: false,
      error: `Token registrasi "${cleanToken}" tidak ditemukan atau sudah pernah digunakan.`,
    };
  }

  const target = db.profiles[profileIdx];

  // If another profile currently holds this LINE User ID, unlink it first
  db.profiles.forEach((p, idx) => {
    if (idx !== profileIdx && p.line_user_id === lineUserId) {
      db.profiles[idx].line_user_id = undefined;
    }
  });

  // Activate the target profile and link LINE User ID
  db.profiles[profileIdx] = {
    ...target,
    line_user_id: lineUserId,
    is_active: true,
    registration_token: undefined, // Consume token (one-time use)
    updated_at: new Date().toISOString(),
  };

  saveDatabase(db);

  const activatedSafeProfile = sanitizeProfile(db.profiles[profileIdx]);

  // Log successful activation audit
  addActivityLog({
    user_id: activatedSafeProfile.id,
    user_name: activatedSafeProfile.name,
    actor_type: 'user',
    action: 'line_account_activated',
    entity_type: 'profile',
    entity_id: activatedSafeProfile.id,
    details: {
      token_used: cleanToken,
      line_user_id: lineUserId,
      email: activatedSafeProfile.email,
      role: activatedSafeProfile.role,
    },
  });

  return { success: true, profile: activatedSafeProfile };
}

export async function regenerateProfileToken(profileId: string): Promise<string | null> {
  const db = loadDatabase();
  const idx = db.profiles.findIndex((p) => p.id === profileId);

  let profileName = 'USER';
  if (idx !== -1) {
    profileName = db.profiles[idx].name;
  } else if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from('profiles').select('name').eq('id', profileId).maybeSingle();
    if (data?.name) {
      profileName = data.name;
    } else {
      return null;
    }
  } else {
    return null;
  }

  const newToken = generateRegistrationToken(profileName);

  if (idx !== -1) {
    db.profiles[idx].registration_token = newToken;
    db.profiles[idx].updated_at = new Date().toISOString();
    saveDatabase(db);
  }

  if (isSupabaseConfigured && supabase) {
    await supabase
      .from('profiles')
      .update({
        registration_token: newToken,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId);
  }

  return newToken;
}

export async function createProfile(
  profile: Omit<Profile, 'id' | 'created_at'>,
  plainPassword?: string
): Promise<SafeProfile> {
  const db = loadDatabase();
  const normalizedEmail = profile.email.trim().toLowerCase();

  // Check Supabase if configured
  if (isSupabaseConfigured && supabase) {
    const { data: existingSupa } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingSupa) {
      throw new Error(`Email "${profile.email}" sudah terdaftar dalam sistem.`);
    }
  } else {
    const existing = db.profiles.find((p) => p.email.trim().toLowerCase() === normalizedEmail);
    if (existing) {
      throw new Error(`Email "${profile.email}" sudah terdaftar dalam sistem.`);
    }
  }

  const passwordHash = plainPassword
    ? bcrypt.hashSync(plainPassword, 10)
    : profile.password_hash || bcrypt.hashSync('MPCommunity2026!', 10);

  // If line_user_id is not yet set, generate a registration token if not provided
  const regToken =
    profile.registration_token ||
    (!profile.line_user_id ? generateRegistrationToken(profile.name) : undefined);

  // If waiting for LINE registration token, account is pending until claimed via LINE
  const isActive = profile.line_user_id ? (profile.is_active ?? true) : false;

  const newProfile: Profile = {
    ...profile,
    email: normalizedEmail,
    password_hash: passwordHash,
    registration_token: regToken,
    is_active: isActive,
    id: randomUUID(),
    created_at: new Date().toISOString(),
  };

  db.profiles.push(newProfile);
  saveDatabase(db);

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('profiles').insert([newProfile]);
    if (error) {
      console.error('Supabase profile insertion error:', error.message);
      throw new Error(`Gagal menyimpan akun ke Supabase: ${error.message}`);
    }

    // Also sync to Supabase Auth auth.users table so it is visible in Supabase Studio "users" table
    try {
      await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: plainPassword || 'MPCommunity2026!',
        email_confirm: true,
        user_metadata: {
          name: newProfile.name,
          role: newProfile.role,
        },
      });
    } catch (authErr) {
      console.warn('Supabase auth.admin.createUser sync warning:', authErr);
    }
  }

  return sanitizeProfile(newProfile);
}

export async function deleteProfile(id: string): Promise<boolean> {
  const db = loadDatabase();
  const initialLen = db.profiles.length;
  const targetUser = db.profiles.find((p) => p.id === id);
  db.profiles = db.profiles.filter((p) => p.id !== id);
  if (db.profiles.length !== initialLen) {
    saveDatabase(db);
  }

  if (isSupabaseConfigured && supabase) {
    // Look up email if not in local memory
    let userEmail: string | undefined = targetUser?.email;
    if (!userEmail) {
      const { data: prof } = await supabase.from('profiles').select('email').eq('id', id).maybeSingle();
      userEmail = prof?.email;
    }

    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) {
      console.error('Supabase deleteProfile error:', error.message);
      return false;
    }

    // Also remove from Supabase Auth auth.users table
    if (userEmail) {
      try {
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const userList = (authUsers?.users || []) as Array<{ id: string; email?: string }>;
        const authUser = userList.find((u) => u.email === userEmail);
        if (authUser) {
          await supabase.auth.admin.deleteUser(authUser.id);
        }
      } catch (authErr) {
        console.warn('Supabase auth.admin.deleteUser sync warning:', authErr);
      }
    }

    return true;
  }

  return db.profiles.length !== initialLen;
}

export async function updateProfilePassword(
  id: string,
  newPlainPassword: string
): Promise<SafeProfile | null> {
  if (!id || !newPlainPassword) return null;
  const password_hash = bcrypt.hashSync(newPlainPassword, 10);
  const now = new Date().toISOString();

  // 1. Update in-memory and local database
  const db = inMemoryDb || loadDatabase();
  const index = db.profiles.findIndex((p) => p.id === id);
  let updatedProfile: Profile | null = null;

  if (index !== -1) {
    db.profiles[index].password_hash = password_hash;
    db.profiles[index].updated_at = now;
    saveDatabase(db);
    updatedProfile = db.profiles[index];
  }

  // 2. Direct live update in Supabase if configured
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          password_hash,
          updated_at: now,
        })
        .eq('id', id)
        .select()
        .maybeSingle();

      if (!error && data) {
        if (index !== -1) {
          db.profiles[index] = data;
        } else {
          db.profiles.unshift(data);
        }
        saveDatabase(db);

        // Also sync updated password to Supabase Auth auth.users table
        try {
          const { data: authUsers } = await supabase.auth.admin.listUsers();
          const userList = (authUsers?.users || []) as Array<{ id: string; email?: string }>;
          const authUser = userList.find((u) => u.email === data.email);
          if (authUser) {
            await supabase.auth.admin.updateUserById(authUser.id, {
              password: newPlainPassword,
            });
          }
        } catch (authErr) {
          console.warn('Supabase auth.admin.updateUserById sync warning:', authErr);
        }

        return sanitizeProfile(data);
      }
    } catch (err) {
      console.error('Supabase updateProfilePassword error:', err);
    }
  }

  return updatedProfile ? sanitizeProfile(updatedProfile) : null;
}

export async function updateProfile(
  id: string,
  updates: Partial<Profile>,
  newPlainPassword?: string
): Promise<SafeProfile | null> {
  const db = loadDatabase();
  const index = db.profiles.findIndex((p) => p.id === id);

  if (newPlainPassword) {
    updates.password_hash = bcrypt.hashSync(newPlainPassword, 10);
  }
  updates.updated_at = new Date().toISOString();

  let updatedProfile: Profile | null = null;
  if (index !== -1) {
    db.profiles[index] = { ...db.profiles[index], ...updates };
    saveDatabase(db);
    updatedProfile = db.profiles[index];
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (!error && data) {
        if (index !== -1) db.profiles[index] = data;
        else db.profiles.unshift(data);
        saveDatabase(db);
        return sanitizeProfile(data);
      }
    } catch (err) {
      console.error('Supabase updateProfile error:', err);
    }
  }

  return updatedProfile ? sanitizeProfile(updatedProfile) : null;
}

// Line Bot
export async function getLineBot(): Promise<LineBot> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('line_bots')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const db = inMemoryDb || loadDatabase();
        db.line_bot = data as LineBot;
        saveDatabase(db);
        return data as LineBot;
      }
    } catch (err) {
      console.warn('Supabase getLineBot warning:', err);
    }
  }
  return (inMemoryDb || loadDatabase()).line_bot;
}

export function getLineBotSync(): LineBot {
  return (inMemoryDb || loadDatabase()).line_bot;
}

export async function updateLineBot(updates: Partial<LineBot>): Promise<LineBot> {
  const db = loadDatabase();
  db.line_bot = { ...db.line_bot, ...updates, updated_at: new Date().toISOString() };
  saveDatabase(db);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase
        .from('line_bots')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', db.line_bot.id)
        .select()
        .maybeSingle();

      if (data) {
        db.line_bot = data as LineBot;
        saveDatabase(db);
      }
    } catch (err) {
      console.warn('Supabase updateLineBot error:', err);
    }
  }

  return db.line_bot;
}

// Line Groups - Live from Supabase if configured
export async function getLineGroups(): Promise<LineGroup[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('line_groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const db = inMemoryDb || loadDatabase();
        db.line_groups = data as LineGroup[];
        saveDatabase(db);
        return data as LineGroup[];
      }
    } catch (err) {
      console.warn('Supabase getLineGroups warning:', err);
    }
  }
  return (inMemoryDb || loadDatabase()).line_groups;
}

export async function getLineGroupById(id: string): Promise<LineGroup | undefined> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('line_groups')
        .select('*')
        .or(`id.eq.${id},group_id.eq.${id}`)
        .maybeSingle();

      if (!error && data) {
        return data as LineGroup;
      }
    } catch (err) {}
  }
  return (inMemoryDb || loadDatabase()).line_groups.find((g) => g.id === id || g.group_id === id);
}

export async function updateLineGroup(id: string, updates: Partial<LineGroup>): Promise<LineGroup | null> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('line_groups')
        .update({ ...updates, updated_at: now })
        .or(`id.eq.${id},group_id.eq.${id}`)
        .select()
        .maybeSingle();

      if (!error && data) {
        const db = inMemoryDb || loadDatabase();
        const idx = db.line_groups.findIndex((g) => g.id === id || g.group_id === id);
        if (idx !== -1) db.line_groups[idx] = data as LineGroup;
        else db.line_groups.unshift(data as LineGroup);
        saveDatabase(db);
        return data as LineGroup;
      }
    } catch (err) {
      console.warn('Supabase updateLineGroup error:', err);
    }
  }

  const db = loadDatabase();
  const idx = db.line_groups.findIndex((g) => g.id === id || g.group_id === id);
  if (idx === -1) return null;
  db.line_groups[idx] = { ...db.line_groups[idx], ...updates, updated_at: now };
  saveDatabase(db);
  return db.line_groups[idx];
}

export async function deleteLineGroup(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('line_groups')
        .delete()
        .or(`id.eq.${id},group_id.eq.${id}`);

      if (error) {
        console.error('Supabase deleteLineGroup error:', error.message);
        return false;
      }
    } catch (err) {
      console.error('Supabase deleteLineGroup exception:', err);
      return false;
    }
  }

  const db = loadDatabase();
  db.line_groups = db.line_groups.filter((g) => g.id !== id && g.group_id !== id);
  saveDatabase(db);
  return true;
}

export async function createLineGroup(group: Omit<LineGroup, 'id' | 'created_at'>): Promise<LineGroup> {
  const newGroup: LineGroup = {
    ...group,
    id: randomUUID(),
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('line_groups')
        .insert([newGroup])
        .select()
        .maybeSingle();

      if (error) {
        console.error('Supabase createLineGroup error:', error.message);
        throw new Error(`Gagal menyimpan grup ke Supabase: ${error.message}`);
      }
      if (data) {
        const db = inMemoryDb || loadDatabase();
        db.line_groups.unshift(data as LineGroup);
        saveDatabase(db);
        return data as LineGroup;
      }
    } catch (err: any) {
      console.error('Supabase createLineGroup exception:', err);
      throw err;
    }
  }

  const db = loadDatabase();
  db.line_groups.unshift(newGroup);
  saveDatabase(db);
  return newGroup;
}

// Members - Live from Supabase if configured
export async function getMembers(): Promise<Member[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('full_name', { ascending: true });

      if (!error && Array.isArray(data)) {
        const db = inMemoryDb || loadDatabase();
        db.members = data as Member[];
        saveDatabase(db);
        return data as Member[];
      }
    } catch (err) {
      console.warn('Supabase getMembers warning:', err);
    }
  }
  return (inMemoryDb || loadDatabase()).members;
}

export async function getMemberById(id: string): Promise<Member | undefined> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return data as Member;
      }
    } catch (err) {}
  }
  return (inMemoryDb || loadDatabase()).members.find((m) => m.id === id);
}

export async function createMember(member: Omit<Member, 'id' | 'created_at'>): Promise<Member> {
  const newMember: Member = {
    ...member,
    id: randomUUID(),
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('members')
        .insert([newMember])
        .select()
        .maybeSingle();

      if (!error && data) {
        const db = inMemoryDb || loadDatabase();
        db.members.push(data as Member);
        saveDatabase(db);
        return data as Member;
      }
      if (error) {
        console.warn('Supabase member insert warning:', error.message);
        // Fall back to base columns if newly added columns aren't in Supabase schema cache
        const basePayload = {
          id: newMember.id,
          full_name: newMember.full_name,
          birth_date: newMember.birth_date,
          birth_month: newMember.birth_month,
          birth_year: newMember.birth_year,
          line_user_id: newMember.line_user_id,
          line_display_name: newMember.line_display_name,
          line_verification_status: newMember.line_verification_status,
          status: newMember.status,
          notes: newMember.notes,
          created_at: newMember.created_at,
        };
        const { data: baseData, error: baseErr } = await supabase
          .from('members')
          .insert([basePayload])
          .select()
          .maybeSingle();

        if (baseErr) {
          throw new Error(`Gagal menyimpan anggota ke Supabase: ${baseErr.message}`);
        }
        if (baseData) {
          const db = inMemoryDb || loadDatabase();
          db.members.push(baseData as Member);
          saveDatabase(db);
          return baseData as Member;
        }
      }
    } catch (err: any) {
      console.error('Supabase createMember exception:', err);
      throw err;
    }
  }

  const db = loadDatabase();
  db.members.push(newMember);
  saveDatabase(db);
  return newMember;
}

export async function updateMember(id: string, updates: Partial<Member>): Promise<Member | null> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('members')
        .update({ ...updates, updated_at: now })
        .eq('id', id)
        .select()
        .maybeSingle();

      if (!error && data) {
        const db = inMemoryDb || loadDatabase();
        const idx = db.members.findIndex((m) => m.id === id);
        if (idx !== -1) db.members[idx] = data as Member;
        else db.members.push(data as Member);
        saveDatabase(db);
        return data as Member;
      }
    } catch (err) {
      console.warn('Supabase updateMember error:', err);
    }
  }

  const db = loadDatabase();
  const idx = db.members.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  db.members[idx] = { ...db.members[idx], ...updates, updated_at: now };
  saveDatabase(db);
  return db.members[idx];
}

export async function deleteMember(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) {
        console.error('Supabase deleteMember error:', error.message);
        return false;
      }
    } catch (err) {
      console.error('Supabase deleteMember exception:', err);
      return false;
    }
  }

  const db = loadDatabase();
  db.members = db.members.filter((m) => m.id !== id);
  saveDatabase(db);
  return true;
}

export async function deleteMembersBulk(ids: string[]): Promise<{ success: boolean; count: number; deletedIds: string[] }> {
  if (!ids || ids.length === 0) {
    return { success: true, count: 0, deletedIds: [] };
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('members').delete().in('id', ids);
      if (error) {
        console.error('Supabase deleteMembersBulk error:', error.message);
      }
    } catch (err) {
      console.error('Supabase deleteMembersBulk exception:', err);
    }
  }

  const db = loadDatabase();
  const idSet = new Set(ids);
  db.members = db.members.filter((m) => !idSet.has(m.id));
  saveDatabase(db);

  return {
    success: true,
    count: ids.length,
    deletedIds: ids,
  };
}

// Devotionals - Live from Supabase if configured
export async function getDevotionals(): Promise<Devotional[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('devotionals')
        .select('*')
        .order('devotional_date', { ascending: false });

      if (!error && Array.isArray(data)) {
        const db = inMemoryDb || loadDatabase();
        db.devotionals = data as Devotional[];
        saveDatabase(db);
        return data as Devotional[];
      }
    } catch (err) {
      console.warn('Supabase getDevotionals warning:', err);
    }
  }
  return (inMemoryDb || loadDatabase()).devotionals;
}

export async function getDevotionalByDate(dateStr: string): Promise<Devotional | undefined> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('devotionals')
        .select('*')
        .eq('devotional_date', dateStr)
        .maybeSingle();

      if (!error && data) {
        return data as Devotional;
      }
    } catch (err) {}
  }
  return (inMemoryDb || loadDatabase()).devotionals.find((d) => d.devotional_date === dateStr);
}

export async function getDevotionalById(id: string): Promise<Devotional | undefined> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('devotionals')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return data as Devotional;
      }
    } catch (err) {}
  }
  return (inMemoryDb || loadDatabase()).devotionals.find((d) => d.id === id);
}

export async function saveDevotional(devotional: Devotional): Promise<Devotional> {
  const db = loadDatabase();
  const idx = db.devotionals.findIndex((d) => d.id === devotional.id || d.devotional_date === devotional.devotional_date);
  if (idx !== -1) {
    db.devotionals[idx] = { ...devotional, updated_at: new Date().toISOString() };
  } else {
    db.devotionals.unshift(devotional);
  }
  saveDatabase(db);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('devotionals').upsert([devotional]);
    } catch (err) {
      console.warn('Supabase saveDevotional error:', err);
    }
  }
  return devotional;
}

export async function updateDevotionalAudit(
  id: string,
  auditStatus: DevotionalAuditStatus,
  auditorName: string,
  notes?: string
): Promise<Devotional | null> {
  const db = loadDatabase();
  const idx = db.devotionals.findIndex((d) => d.id === id);
  if (idx === -1) return null;

  const now = new Date().toISOString();
  db.devotionals[idx].audit_status = auditStatus;
  db.devotionals[idx].last_audited_by = auditorName;
  db.devotionals[idx].last_audited_at = now;
  db.devotionals[idx].updated_at = now;

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('devotionals')
        .update({
          audit_status: auditStatus,
          last_audited_by: auditorName,
          last_audited_at: now,
          updated_at: now,
        })
        .eq('id', id);
    } catch (err) {
      console.warn('Supabase updateDevotionalAudit error:', err);
    }
  }

  // Log action
  addActivityLog({
    user_name: auditorName,
    actor_type: 'user',
    action: `devotional_${auditStatus}`,
    entity_type: 'devotional',
    entity_id: id,
    details: { status: auditStatus, notes: notes || '' },
  });

  saveDatabase(db);
  return db.devotionals[idx];
}

// Devotional Source
export function getDevotionalSources(): DevotionalSource[] {
  return loadDatabase().devotional_sources;
}

export function getDevotionalSourceByDate(dateStr: string): DevotionalSource | undefined {
  return loadDatabase().devotional_sources.find((s) => s.target_date === dateStr);
}

export function saveDevotionalSource(source: DevotionalSource): DevotionalSource {
  const db = loadDatabase();
  const idx = db.devotional_sources.findIndex((s) => s.target_date === source.target_date);
  if (idx !== -1) {
    db.devotional_sources[idx] = source;
  } else {
    db.devotional_sources.unshift(source);
  }
  saveDatabase(db);
  return source;
}

// Settings - Live from Supabase if configured
export async function getAutomationSettings(): Promise<AutomationSettings> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('automation_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const db = inMemoryDb || loadDatabase();
        db.settings = { ...db.settings, ...data };
        saveDatabase(db);
        return db.settings;
      }
    } catch (err) {
      console.warn('Supabase getAutomationSettings warning:', err);
    }
  }
  return (inMemoryDb || loadDatabase()).settings;
}

export function getAutomationSettingsSync(): AutomationSettings {
  return (inMemoryDb || loadDatabase()).settings;
}

export async function updateAutomationSettings(updates: Partial<AutomationSettings>): Promise<AutomationSettings> {
  const db = loadDatabase();
  db.settings = { ...db.settings, ...updates };
  saveDatabase(db);

  if (isSupabaseConfigured && supabase) {
    try {
      const settingId = (db.settings as any).id;
      const query = supabase.from('automation_settings').update(updates);
      const { data } = settingId ? await query.eq('id', settingId).select().maybeSingle() : await query.neq('devotional_scraping_time', '').select().maybeSingle();

      if (data) {
        db.settings = { ...db.settings, ...data };
        saveDatabase(db);
      }
    } catch (err) {
      console.warn('Supabase updateAutomationSettings error:', err);
    }
  }
  return db.settings;
}

// Deliveries (Broadcast History)
export async function getDeliveries(): Promise<BroadcastDelivery[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('broadcast_deliveries')
        .select('*')
        .order('delivered_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as BroadcastDelivery[];
      }
    } catch (err) {
      console.warn('Supabase getDeliveries warning:', err);
    }
  }
  return loadDatabase().deliveries;
}

export function addDelivery(delivery: Omit<BroadcastDelivery, 'id' | 'delivered_at'>): BroadcastDelivery {
  const db = loadDatabase();
  const newDelivery: BroadcastDelivery = {
    ...delivery,
    id: randomUUID(),
    delivered_at: new Date().toISOString(),
  };
  db.deliveries.unshift(newDelivery);
  saveDatabase(db);
  if (isSupabaseConfigured && supabase) {
    supabase.from('broadcast_deliveries').insert([newDelivery]).then();
  }
  return newDelivery;
}

export function deleteDelivery(id: string): boolean {
  const db = loadDatabase();
  const initLen = db.deliveries.length;
  db.deliveries = db.deliveries.filter((d) => d.id !== id);
  if (db.deliveries.length !== initLen) {
    saveDatabase(db);
    if (isSupabaseConfigured && supabase) {
      supabase.from('broadcast_deliveries').delete().eq('id', id).then();
    }
    return true;
  }
  return false;
}

export function deleteDeliveriesBulk(ids: string[]): { success: boolean; count: number; deletedIds: string[] } {
  if (!ids || ids.length === 0) return { success: true, count: 0, deletedIds: [] };
  const db = loadDatabase();
  const idSet = new Set(ids);
  const initLen = db.deliveries.length;
  const deleted = db.deliveries.filter((d) => idSet.has(d.id));
  db.deliveries = db.deliveries.filter((d) => !idSet.has(d.id));
  const count = initLen - db.deliveries.length;
  if (count > 0) {
    saveDatabase(db);
    if (isSupabaseConfigured && supabase) {
      supabase.from('broadcast_deliveries').delete().in('id', ids).then();
    }
  }
  return { success: true, count, deletedIds: deleted.map((d) => d.id) };
}

export function clearAllDeliveries(): { success: boolean; count: number } {
  const db = loadDatabase();
  const count = db.deliveries.length;
  db.deliveries = [];
  saveDatabase(db);
  if (isSupabaseConfigured && supabase) {
    supabase
      .from('broadcast_deliveries')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .then();
  }
  return { success: true, count };
}

// Activity Logs
export async function getActivityLogs(): Promise<ActivityLog[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (!error && data && data.length > 0) {
        return data as ActivityLog[];
      }
    } catch (err) {
      console.warn('Supabase getActivityLogs warning:', err);
    }
  }
  return loadDatabase().logs;
}

export function addActivityLog(log: Omit<ActivityLog, 'id' | 'created_at'>): ActivityLog {
  const db = loadDatabase();
  const newLog: ActivityLog = {
    ...log,
    id: randomUUID(),
    created_at: new Date().toISOString(),
  };
  db.logs.unshift(newLog);
  // Keep last 200 logs
  if (db.logs.length > 200) {
    db.logs = db.logs.slice(0, 200);
  }
  saveDatabase(db);

  if (isSupabaseConfigured && supabase) {
    supabase.from('activity_logs').insert([{
      id: newLog.id,
      user_id: (log.user_id && log.user_id.length > 20) ? log.user_id : null,
      actor_type: log.actor_type,
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id || null,
      details: log.details || null,
      created_at: newLog.created_at,
    }]).then();
  }

  return newLog;
}

export function deleteActivityLog(id: string): boolean {
  const db = loadDatabase();
  const initLen = db.logs.length;
  db.logs = db.logs.filter((l) => l.id !== id);
  if (db.logs.length !== initLen) {
    saveDatabase(db);
    if (isSupabaseConfigured && supabase) {
      supabase.from('activity_logs').delete().eq('id', id).then();
    }
    return true;
  }
  return false;
}

export function deleteActivityLogsBulk(ids: string[]): { success: boolean; count: number; deletedIds: string[] } {
  if (!ids || ids.length === 0) return { success: true, count: 0, deletedIds: [] };
  const db = loadDatabase();
  const idSet = new Set(ids);
  const initLen = db.logs.length;
  const deleted = db.logs.filter((l) => idSet.has(l.id));
  db.logs = db.logs.filter((l) => !idSet.has(l.id));
  const count = initLen - db.logs.length;
  if (count > 0) {
    saveDatabase(db);
    if (isSupabaseConfigured && supabase) {
      supabase.from('activity_logs').delete().in('id', ids).then();
    }
  }
  return { success: true, count, deletedIds: deleted.map((l) => l.id) };
}

export function clearAllActivityLogs(): { success: boolean; count: number } {
  const db = loadDatabase();
  const count = db.logs.length;
  db.logs = [];
  saveDatabase(db);
  if (isSupabaseConfigured && supabase) {
    supabase
      .from('activity_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .then();
  }
  return { success: true, count };
}

// Notifications
export function getNotifications(): NotificationItem[] {
  return loadDatabase().notifications;
}

export function addNotification(notif: Omit<NotificationItem, 'id' | 'created_at' | 'is_read'>): NotificationItem {
  const db = loadDatabase();
  const newNotif: NotificationItem = {
    ...notif,
    id: randomUUID(),
    is_read: false,
    created_at: new Date().toISOString(),
  };
  db.notifications.unshift(newNotif);
  saveDatabase(db);
  return newNotif;
}

export function markNotificationAsRead(id: string) {
  const db = loadDatabase();
  const notif = db.notifications.find((n) => n.id === id);
  if (notif) {
    notif.is_read = true;
    saveDatabase(db);
  }
}
