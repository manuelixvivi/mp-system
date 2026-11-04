// MP Control System - Type Definitions

export type UserRole = 'superadmin' | 'liturgi' | 'logistik' | 'pubdok';

export type MemberCommunityRole =
  | 'anggota_aktif'
  | 'ketua'
  | 'wakil_ketua'
  | 'bendahara'
  | 'sekretaris'
  | 'liturgi_humas'
  | 'logistik'
  | 'pubdok'
  | 'acara';

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  password_hash?: string; // Securely hashed with bcrypt - NEVER exposed to frontend
  line_user_id?: string;
  is_active: boolean;
  registration_token?: string; // One-time token e.g. "ABEL123" for LINE activation
  created_at: string;
  updated_at?: string;
}

export type SafeProfile = Omit<Profile, 'password_hash'>;

export interface LineBot {
  id: string;
  name: string;
  channel_id: string;
  channel_secret: string;
  channel_access_token: string;
  is_active: boolean;
  status: 'connected' | 'disconnected' | 'error';
  webhook_url?: string;
  created_at: string;
  updated_at?: string;
}

export type AutomationModule = 'devotional' | 'birthday';

export interface LineGroup {
  id: string;
  group_id: string;
  group_name: string;
  description?: string;
  is_active: boolean;
  assigned_modules: AutomationModule[];
  member_count: number;
  bot_joined_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface Member {
  id: string;
  full_name: string; // Nama Lengkap
  nickname?: string; // Nama Panggilan
  baptismal_name?: string; // Nama Baptis
  birth_date: number; // 1-31 (Tanggal Lahir)
  birth_month: number; // 1-12 (Bulan Lahir)
  birth_year?: number; // Tahun Lahir
  class_origin?: string; // Asal Kelas (misal: XII MIPA 1, XI-A, PPTI 26)
  entry_year?: number; // Tahun Masuk (untuk filter angkatan)
  line_id?: string; // ID LINE publik (misal: @cukurukuk0906)
  line_user_id?: string; // Akun LINE (User ID acak U...)
  line_display_name?: string;
  instagram_account?: string; // Akun Instagram (misal: @username)
  whatsapp_number?: string; // Nomor WhatsApp
  photo_url?: string; // Foto diri anggota (dari registrasi atau drive)
  birthday_card_url?: string; // Hasil edit kartu ultah oleh pubdok
  community_role?: MemberCommunityRole; // Role di komunitas MP
  line_verification_status: 'verified' | 'unverified' | 'not_set';
  status: 'active' | 'inactive';
  notes?: string;
  assigned_groups?: string[]; // array of line_group_ids
  created_at: string;
  updated_at?: string;
}

export interface BirthdayTemplate {
  id: string;
  year: number;
  template_name: string;
  image_url: string;
  is_active: boolean;
  frame_config?: {
    x: number;
    y: number;
    width: number;
    height: number;
    shape: 'oval' | 'rect' | 'circle';
  };
  created_at: string;
  updated_at?: string;
}

export interface BirthdayGroupAssignment {
  id: string;
  member_id: string;
  line_group_id: string;
  is_primary: boolean;
  created_at: string;
}

export interface BirthdayBroadcast {
  id: string;
  broadcast_date: string; // YYYY-MM-DD
  line_group_id: string;
  group_name?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  total_members: number;
  total_batches: number;
  trigger_type: 'automated' | 'manual';
  triggered_by_profile_id?: string;
  triggered_by_name?: string;
  scheduled_at?: string;
  executed_at?: string;
  error_message?: string;
  created_at: string;
}

export interface BirthdayBroadcastMessage {
  id: string;
  birthday_broadcast_id: string;
  batch_number: number;
  format_type: 'full' | 'short';
  message_text: string;
  mentions_payload: any;
  recipient_count: number;
  line_message_id?: string;
  status: 'pending' | 'sent' | 'failed';
  error_message?: string;
  sent_at?: string;
}

export interface DevotionalSource {
  id: string;
  target_date: string; // YYYY-MM-DD
  source_url: string;
  raw_title?: string;
  raw_content?: string;
  scraping_status: 'pending' | 'success' | 'failed';
  error_details?: string;
  scraped_at?: string;
}

export type DevotionalAuditStatus = 'pending' | 'approved' | 'revision_required' | 'rejected';

export interface Devotional {
  id: string;
  devotional_date: string; // YYYY-MM-DD
  source_id?: string;
  saint_commemoration?: string;
  verse_reference: string;
  verse_text: string;
  reflection: string;
  mind_check: string;
  take_one_step: string;
  formatted_message: string;
  audit_status: DevotionalAuditStatus;
  is_fallback_eligible: boolean;
  revisions_count?: number;
  last_audited_by?: string;
  last_audited_at?: string;
  audit_notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface DevotionalRevision {
  id: string;
  devotional_id: string;
  editor_profile_id: string;
  editor_name?: string;
  previous_content: Partial<Devotional>;
  updated_content: Partial<Devotional>;
  change_summary: string;
  created_at: string;
}

export interface DevotionalAudit {
  id: string;
  devotional_id: string;
  auditor_profile_id: string;
  auditor_name?: string;
  action: 'approve' | 'request_revision' | 'reject' | 'fallback_auto_approved';
  audit_notes?: string;
  created_at: string;
}

export interface AutomationSettings {
  devotional_scraping_time: string; // "00:00"
  devotional_broadcast_time: string; // "09:45"
  birthday_broadcast_time: string; // "07:00"
  devotional_fallback_enabled: boolean;
  birthday_mention_limit: number;
  timezone: string;
  devotional_automation_active: boolean;
  birthday_automation_active: boolean;
  groq_api_key?: string;
  groq_model?: string;
}

export interface ScheduledJob {
  id: string;
  job_type: 'devotional_scrape' | 'devotional_broadcast' | 'birthday_broadcast';
  scheduled_time: string;
  idempotency_key: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped' | 'cancelled';
  retry_count: number;
  max_retries: number;
  last_error?: string;
  payload?: any;
  created_at: string;
  executed_at?: string;
}

export interface BroadcastDelivery {
  id: string;
  module: AutomationModule;
  reference_id: string;
  line_group_id: string;
  group_name?: string;
  delivery_type: 'scheduled' | 'manual' | 'fallback';
  sender_profile_id?: string;
  sender_name?: string;
  sender_channel: 'dashboard' | 'line_chat' | 'system_cron';
  status: 'success' | 'failed';
  error_message?: string;
  idempotency_key: string;
  delivered_at: string;
}

export interface ActivityLog {
  id: string;
  user_id?: string;
  user_name?: string;
  actor_type: 'user' | 'line_bot' | 'system_scheduler';
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: any;
  ip_address?: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  recipient_role: UserRole | 'all';
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
}
