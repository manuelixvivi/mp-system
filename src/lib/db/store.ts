import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
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

function loadDatabase(): DatabaseData {
  if (inMemoryDb) {
    return inMemoryDb;
  }

  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const content = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      inMemoryDb = JSON.parse(content);
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

  const db = loadDatabase();
  const user = db.profiles.find(
    (p) => p.email.toLowerCase() === email.trim().toLowerCase() && p.is_active
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

export function activateProfileByToken(
  token: string,
  lineUserId: string
): { success: boolean; profile?: SafeProfile; error?: string } {
  if (!token || !lineUserId) {
    return { success: false, error: 'Token registrasi dan LINE User ID wajib diisi.' };
  }

  const db = loadDatabase();
  const cleanToken = token.trim().toUpperCase();

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
    id: `prof_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
  };

  db.profiles.push(newProfile);
  saveDatabase(db);
  return sanitizeProfile(newProfile);
}

export function deleteProfile(id: string): boolean {
  const db = loadDatabase();
  const initialLen = db.profiles.length;
  db.profiles = db.profiles.filter((p) => p.id !== id);
  if (db.profiles.length !== initialLen) {
    saveDatabase(db);
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
    return true;
  }
  return false;
}

export function createLineGroup(group: Omit<LineGroup, 'id' | 'created_at'>): LineGroup {
  const db = loadDatabase();
  const newGroup: LineGroup = {
    ...group,
    id: `grp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
  };
  db.line_groups.push(newGroup);
  saveDatabase(db);
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
    id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
  };
  db.members.push(newMember);
  saveDatabase(db);
  return newMember;
}

export function updateMember(id: string, updates: Partial<Member>): Member | null {
  const db = loadDatabase();
  const idx = db.members.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  db.members[idx] = { ...db.members[idx], ...updates, updated_at: new Date().toISOString() };
  saveDatabase(db);
  return db.members[idx];
}

export function deleteMember(id: string): boolean {
  const db = loadDatabase();
  const initLen = db.members.length;
  db.members = db.members.filter((m) => m.id !== id);
  if (db.members.length !== initLen) {
    saveDatabase(db);
    return true;
  }
  return false;
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
    id: `del_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
  };
  db.logs.unshift(newLog);
  // Keep last 200 logs
  if (db.logs.length > 200) {
    db.logs = db.logs.slice(0, 200);
  }
  saveDatabase(db);
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
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
