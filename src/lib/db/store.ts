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
    const [profRes, grpRes, memRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('line_groups').select('*'),
      supabase.from('members').select('*'),
    ]);

    const db = inMemoryDb || loadDatabase();
    if (profRes.data && profRes.data.length > 0) {
      const supaProfiles = profRes.data as Profile[];
      const mergedMap = new Map<string, Profile>();
      supaProfiles.forEach((p) => mergedMap.set(p.id, p));
      db.profiles.forEach((p) => {
        if (!mergedMap.has(p.id)) mergedMap.set(p.id, p);
      });
      db.profiles = Array.from(mergedMap.values());
    }
    if (grpRes.data && grpRes.data.length > 0) {
      db.line_groups = grpRes.data as LineGroup[];
    }
    if (memRes.data && memRes.data.length > 0) {
      db.members = memRes.data as Member[];
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

// Profiles
export function getProfiles(): SafeProfile[] {
  return loadDatabase().profiles.map(sanitizeProfile);
}

export function getProfileById(id: string): SafeProfile | undefined {
  const profile = loadDatabase().profiles.find((p) => p.id === id);
  return profile ? sanitizeProfile(profile) : undefined;
}

export function getProfileByEmail(email: string): SafeProfile | undefined {
  const profile = loadDatabase().profiles.find(
    (p) => p.email.toLowerCase() === email.trim().toLowerCase() && p.is_active
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

export function regenerateProfileToken(profileId: string): string | null {
  const db = loadDatabase();
  const idx = db.profiles.findIndex((p) => p.id === profileId);
  if (idx === -1) return null;

  const newToken = generateRegistrationToken(db.profiles[idx].name);
  db.profiles[idx].registration_token = newToken;
  db.profiles[idx].updated_at = new Date().toISOString();
  saveDatabase(db);

  if (isSupabaseConfigured && supabase) {
    supabase
      .from('profiles')
      .update({
        registration_token: newToken,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId)
      .then();
  }

  return newToken;
}

export function createProfile(
  profile: Omit<Profile, 'id' | 'created_at'>,
  plainPassword?: string
): SafeProfile {
  const db = loadDatabase();
  const normalizedEmail = profile.email.trim().toLowerCase();

  const existing = db.profiles.find((p) => p.email.trim().toLowerCase() === normalizedEmail);
  if (existing) {
    throw new Error(`Email "${profile.email}" sudah terdaftar dalam sistem.`);
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
    supabase
      .from('profiles')
      .insert([newProfile])
      .then(({ error }) => {
        if (error) console.error('Supabase profile insertion error:', error.message);
      });
  }

  return sanitizeProfile(newProfile);
}

export function deleteProfile(id: string): boolean {
  const db = loadDatabase();
  const initialLen = db.profiles.length;
  db.profiles = db.profiles.filter((p) => p.id !== id);
  if (db.profiles.length !== initialLen) {
    saveDatabase(db);
    if (isSupabaseConfigured && supabase) {
      supabase.from('profiles').delete().eq('id', id).then();
    }
    return true;
  }
  return false;
}

export function updateProfile(id: string, updates: Partial<Profile>, newPlainPassword?: string): SafeProfile | null {
  const db = loadDatabase();
  const index = db.profiles.findIndex((p) => p.id === id);
  if (index === -1) return null;

  if (newPlainPassword) {
    updates.password_hash = bcrypt.hashSync(newPlainPassword, 10);
  }

  db.profiles[index] = { ...db.profiles[index], ...updates, updated_at: new Date().toISOString() };
  saveDatabase(db);
  return sanitizeProfile(db.profiles[index]);
}

// Line Bot
export function getLineBot(): LineBot {
  return loadDatabase().line_bot;
}

export function updateLineBot(updates: Partial<LineBot>): LineBot {
  const db = loadDatabase();
  db.line_bot = { ...db.line_bot, ...updates, updated_at: new Date().toISOString() };
  saveDatabase(db);
  return db.line_bot;
}

// Line Groups
export function getLineGroups(): LineGroup[] {
  return loadDatabase().line_groups;
}

export function getLineGroupById(id: string): LineGroup | undefined {
  return loadDatabase().line_groups.find((g) => g.id === id || g.group_id === id);
}

export function updateLineGroup(id: string, updates: Partial<LineGroup>): LineGroup | null {
  const db = loadDatabase();
  const idx = db.line_groups.findIndex((g) => g.id === id || g.group_id === id);
  if (idx === -1) return null;
  db.line_groups[idx] = { ...db.line_groups[idx], ...updates, updated_at: new Date().toISOString() };
  saveDatabase(db);
  return db.line_groups[idx];
}

export function deleteLineGroup(id: string): boolean {
  const db = loadDatabase();
  const initialLen = db.line_groups.length;
  db.line_groups = db.line_groups.filter((g) => g.id !== id && g.group_id !== id);
  if (db.line_groups.length !== initialLen) {
    saveDatabase(db);
    if (isSupabaseConfigured && supabase) {
      supabase.from('line_groups').delete().eq('id', id).then();
    }
    return true;
  }
  return false;
}

export function createLineGroup(group: Omit<LineGroup, 'id' | 'created_at'>): LineGroup {
  const db = loadDatabase();
  const newGroup: LineGroup = {
    ...group,
    id: randomUUID(),
    created_at: new Date().toISOString(),
  };
  db.line_groups.push(newGroup);
  saveDatabase(db);
  if (isSupabaseConfigured && supabase) {
    supabase.from('line_groups').insert([newGroup]).then();
  }
  return newGroup;
}

// Members
export function getMembers(): Member[] {
  return loadDatabase().members;
}

export function getMemberById(id: string): Member | undefined {
  return loadDatabase().members.find((m) => m.id === id);
}

export function createMember(member: Omit<Member, 'id' | 'created_at'>): Member {
  const db = loadDatabase();
  const newMember: Member = {
    ...member,
    id: randomUUID(),
    created_at: new Date().toISOString(),
  };
  db.members.push(newMember);
  saveDatabase(db);
  if (isSupabaseConfigured && supabase) {
    supabase
      .from('members')
      .insert([newMember])
      .then(({ error }) => {
        if (error) {
          console.warn('Supabase member insert warning:', error.message);
          // If schema cache lacks newly added columns, fall back to base columns for Supabase
          if (error.message.includes('schema cache') || error.message.includes('column')) {
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
            supabase.from('members').insert([basePayload]).then();
          }
        }
      });
  }
  return newMember;
}

export function updateMember(id: string, updates: Partial<Member>): Member | null {
  const db = loadDatabase();
  const idx = db.members.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  db.members[idx] = { ...db.members[idx], ...updates, updated_at: new Date().toISOString() };
  saveDatabase(db);
  if (isSupabaseConfigured && supabase) {
    supabase.from('members').update(updates).eq('id', id).then(({ error }) => {
      if (error) {
        console.warn('Supabase updateMember warning:', error.message);
      }
    });
  }
  return db.members[idx];
}

export function deleteMember(id: string): boolean {
  const db = loadDatabase();
  const initLen = db.members.length;
  db.members = db.members.filter((m) => m.id !== id);
  if (db.members.length !== initLen) {
    saveDatabase(db);
    if (isSupabaseConfigured && supabase) {
      supabase.from('members').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Supabase deleteMember error:', error.message);
      });
    }
    return true;
  }
  return false;
}

export function deleteMembersBulk(ids: string[]): { success: boolean; count: number; deletedIds: string[] } {
  if (!ids || ids.length === 0) {
    return { success: true, count: 0, deletedIds: [] };
  }
  const db = loadDatabase();
  const idSet = new Set(ids);
  const initialLen = db.members.length;
  const deletedMembers = db.members.filter((m) => idSet.has(m.id));
  db.members = db.members.filter((m) => !idSet.has(m.id));

  const count = initialLen - db.members.length;
  if (count > 0) {
    saveDatabase(db);
    if (isSupabaseConfigured && supabase) {
      supabase
        .from('members')
        .delete()
        .in('id', ids)
        .then(({ error }) => {
          if (error) console.error('Supabase deleteMembersBulk error:', error.message);
        });
    }
  }

  return {
    success: true,
    count,
    deletedIds: deletedMembers.map((m) => m.id),
  };
}

// Devotionals
export function getDevotionals(): Devotional[] {
  return loadDatabase().devotionals;
}

export function getDevotionalByDate(dateStr: string): Devotional | undefined {
  return loadDatabase().devotionals.find((d) => d.devotional_date === dateStr);
}

export function getDevotionalById(id: string): Devotional | undefined {
  return loadDatabase().devotionals.find((d) => d.id === id);
}

export function saveDevotional(devotional: Devotional): Devotional {
  const db = loadDatabase();
  const idx = db.devotionals.findIndex((d) => d.id === devotional.id || d.devotional_date === devotional.devotional_date);
  if (idx !== -1) {
    db.devotionals[idx] = { ...devotional, updated_at: new Date().toISOString() };
  } else {
    db.devotionals.unshift(devotional);
  }
  saveDatabase(db);
  return devotional;
}

export function updateDevotionalAudit(
  id: string,
  auditStatus: DevotionalAuditStatus,
  auditorName: string,
  notes?: string
): Devotional | null {
  const db = loadDatabase();
  const idx = db.devotionals.findIndex((d) => d.id === id);
  if (idx === -1) return null;

  db.devotionals[idx].audit_status = auditStatus;
  db.devotionals[idx].last_audited_by = auditorName;
  db.devotionals[idx].last_audited_at = new Date().toISOString();
  db.devotionals[idx].updated_at = new Date().toISOString();

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

// Settings
export function getAutomationSettings(): AutomationSettings {
  return loadDatabase().settings;
}

export function updateAutomationSettings(updates: Partial<AutomationSettings>): AutomationSettings {
  const db = loadDatabase();
  db.settings = { ...db.settings, ...updates };
  saveDatabase(db);
  return db.settings;
}

// Deliveries
export function getDeliveries(): BroadcastDelivery[] {
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
  return newDelivery;
}

// Activity Logs
export function getActivityLogs(): ActivityLog[] {
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
