import {
  Profile,
  LineBot,
  LineGroup,
  Member,
  BirthdayGroupAssignment,
  Devotional,
  DevotionalSource,
  AutomationSettings,
  BroadcastDelivery,
  ActivityLog,
  NotificationItem,
} from '@/types';

export const INITIAL_PROFILES: Profile[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'superadmin@mpcommunity.org',
    name: 'Fr. Michael Tan',
    role: 'superadmin',
    password_hash: '$2b$10$l5lAS3KM5mQ/ePs9AAs5rO5wf49XQFxTKoXNoY8vA8nITdq8J2p7C', // SuperAdminMP2026!
    line_user_id: 'U_SUPERADMIN_001',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'liturgi@mpcommunity.org',
    name: 'Sr. Clara Bernadeth',
    role: 'liturgi',
    password_hash: '$2b$10$DOx/wRdV0aWTdEBhfPMnEuy5T9UWxcwk0oA3r8qwA1xEsV/cYIqdK', // LiturgiMP2026!
    line_user_id: 'U_LITURGI_002',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'logistik@mpcommunity.org',
    name: 'Antonius Budi',
    role: 'logistik',
    password_hash: '$2b$10$fX0DYHnQRKNhdZc2HtWbsefmbw5JQrWdYX9mGb.9.L6qjy4S/TbYO', // LogistikMP2026!
    line_user_id: 'U_LOGISTIK_003',
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

export const INITIAL_LINE_BOT: LineBot = {
  id: '44444444-4444-4444-4444-444444444444',
  name: 'MP Community Official Bot',
  channel_id: '2006123456',
  channel_secret: 'sec_9876543210abcdef9876543210ab',
  channel_access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_access_token',
  is_active: true,
  status: 'connected',
  webhook_url: 'https://mp-control.vercel.app/api/line/webhook',
  created_at: new Date().toISOString(),
};

export const INITIAL_LINE_GROUPS: LineGroup[] = [
  {
    id: '55555555-5555-5555-5555-555555555551',
    group_id: 'c-mp-inti-001',
    group_name: 'Grup Inti MP Community',
    description: 'Grup utama seluruh anggota komunitas MP',
    is_active: true,
    assigned_modules: ['devotional', 'birthday'],
    member_count: 48,
    bot_joined_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: '55555555-5555-5555-5555-555555555552',
    group_id: 'c-mp-youth-002',
    group_name: 'Grup OMK & Youth MP',
    description: 'Grup pemuda dan remaja MP',
    is_active: true,
    assigned_modules: ['devotional', 'birthday'],
    member_count: 35,
    bot_joined_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: '55555555-5555-5555-5555-555555555553',
    group_id: 'c-mp-pengurus-003',
    group_name: 'Grup Pengurus & Pelayan MP',
    description: 'Grup koordinasi pengurus & panitia',
    is_active: true,
    assigned_modules: ['devotional'],
    member_count: 18,
    bot_joined_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
];

// Helper to get today's date and month in WIB
const today = new Date();
const todayDate = today.getDate();
const todayMonth = today.getMonth() + 1;
const todayIso = today.toISOString().split('T')[0];

export const INITIAL_MEMBERS: Member[] = [
  {
    id: '66666666-6666-6666-6666-666666666601',
    full_name: 'Kevin Pratama',
    baptismal_name: 'Alexander',
    birth_date: todayDate,
    birth_month: todayMonth,
    birth_year: 1998,
    class_origin: 'XII MIPA 1',
    entry_year: 2022,
    line_user_id: 'U_MEMBER_KEVIN_01',
    line_display_name: 'Kevin Pratama',
    instagram_account: '@kevin_pratama',
    line_verification_status: 'verified',
    status: 'active',
    notes: 'Koordinator Sie Acara',
    assigned_groups: ['55555555-5555-5555-5555-555555555551'],
    created_at: new Date().toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666666602',
    full_name: 'Angela Wijaya',
    baptismal_name: 'Theresia',
    birth_date: todayDate,
    birth_month: todayMonth,
    birth_year: 2001,
    class_origin: 'XII IPS 2',
    entry_year: 2023,
    line_user_id: 'U_MEMBER_ANGELA_02',
    line_display_name: 'Angela W',
    instagram_account: '@angela.wijaya',
    line_verification_status: 'verified',
    status: 'active',
    notes: 'Tim Paduan Suara',
    assigned_groups: ['55555555-5555-5555-5555-555555555551'],
    created_at: new Date().toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666666603',
    full_name: 'Ryan Santoso',
    baptismal_name: 'Benedictus',
    birth_date: todayDate,
    birth_month: todayMonth,
    birth_year: 1995,
    class_origin: 'XI MIPA 3',
    entry_year: 2022,
    line_user_id: 'U_MEMBER_RYAN_03',
    line_display_name: 'Ryan Santoso',
    instagram_account: '@ryansantoso_',
    line_verification_status: 'verified',
    status: 'active',
    notes: 'Anggota Komunitas',
    assigned_groups: ['55555555-5555-5555-5555-555555555551'],
    created_at: new Date().toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666666604',
    full_name: 'Natalia Kusumawati',
    baptismal_name: 'Maria',
    birth_date: (todayDate % 28) + 1,
    birth_month: todayMonth,
    birth_year: 1997,
    class_origin: 'XII BAHASA',
    entry_year: 2024,
    line_user_id: 'U_MEMBER_NATALIA_04',
    line_display_name: 'Natalia K',
    instagram_account: '@natalia_kusuma',
    line_verification_status: 'verified',
    status: 'active',
    notes: 'Sekretaris',
    assigned_groups: ['55555555-5555-5555-5555-555555555551'],
    created_at: new Date().toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666666605',
    full_name: 'Dimas Prasetyo',
    baptismal_name: 'Ignatius',
    birth_date: ((todayDate + 2) % 28) + 1,
    birth_month: todayMonth,
    birth_year: 2000,
    class_origin: 'X-1',
    entry_year: 2025,
    line_user_id: 'U_MEMBER_DIMAS_05',
    line_display_name: 'Dimas Prasetyo',
    instagram_account: '@dimas_pras',
    line_verification_status: 'verified',
    status: 'active',
    notes: 'Tim Multimedia',
    assigned_groups: ['55555555-5555-5555-5555-555555555552'],
    created_at: new Date().toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666666606',
    full_name: 'Cindy Lestari',
    baptismal_name: 'Agnes',
    birth_date: ((todayDate + 5) % 28) + 1,
    birth_month: todayMonth,
    birth_year: 1999,
    class_origin: 'XI IPS 1',
    entry_year: 2024,
    line_user_id: '',
    line_display_name: 'Cindy L',
    instagram_account: '@cindylestari',
    line_verification_status: 'not_set',
    status: 'active',
    notes: 'Menunggu penautan LINE ID',
    assigned_groups: ['55555555-5555-5555-5555-555555555552'],
    created_at: new Date().toISOString(),
  },
  {
    id: '66666666-6666-6666-6666-666666666607',
    full_name: 'Jonathan Hartono',
    baptismal_name: 'Gabriel',
    birth_date: 15,
    birth_month: 11,
    birth_year: 2002,
    class_origin: 'XII MIPA 3',
    entry_year: 2023,
    line_user_id: 'U_MEMBER_JONATHAN_07',
    line_display_name: 'Jonathan H',
    instagram_account: '@jonathan.hartono',
    line_verification_status: 'verified',
    status: 'active',
    notes: 'Seksi Perlengkapan',
    assigned_groups: ['55555555-5555-5555-5555-555555555551'],
    created_at: new Date().toISOString(),
  },
];

export const INITIAL_DEVOTIONAL_SOURCE: DevotionalSource = {
  id: '88888888-8888-8888-8888-888888888801',
  target_date: todayIso,
  source_url: 'https://www.thekatolik.com/2026/10/renungan-harian-katolik-hari-ini.html',
  raw_title: 'Renungan Harian Katolik: Berani Berubah dan Bertransformasi',
  raw_content: `Bacaan Injil hari ini mengajak kita untuk merenungkan pembaruan budi dan ketulusan hati dalam mengikut Yesus. Dalam kehidupan modern yang serba cepat dan menuntut, sering kali kita tergoda untuk menyesuaikan diri dengan apa yang dianggap wajar oleh dunia: mencari kenyamanan diri, membalas perlakuan buruk dengan hal serupa, atau mengabaikan sesama yang menderita. Rasul Paulus mengingatkan kita dalam suratnya kepada jemaat di Roma agar kita memperbarui akal budi kita sehingga dapat mengenali apa yang berkenan di hadapan Allah.`,
  scraping_status: 'success',
  scraped_at: new Date(Date.now() - 8 * 3600000).toISOString(),
};

export const INITIAL_DEVOTIONAL: Devotional = {
  id: '99999999-9999-9999-9999-999999999901',
  devotional_date: todayIso,
  source_id: '88888888-8888-8888-8888-888888888801',
  verse_reference: 'Roma 12:2',
  verse_text: 'Janganlah kamu menjadi serupa dengan dunia ini, tetapi berubahlah oleh pembaruan budimu, sehingga kamu dapat membedakan manakah kehendak Allah: apa yang baik, yang berkenan kepada Allah dan yang sempurna.',
  reflection: 'Dalam kesibukan harian kita yang sering kali bising dan dipenuhi oleh standar duniawi, Tuhan mengundang kita untuk berhenti sejenak. Memperbarui budi berarti mengarahkan pandangan kita kembali kepada Kristus, menyelaraskan setiap keputusan dan perbuatan dengan firman-Nya.',
  mind_check: 'Apakah hari ini tindakanku lebih banyak didorong oleh opini orang sekitar atau kerinduan menyenangkan hati Tuhan?',
  take_one_step: 'Ambil jeda 3 menit hari ini untuk mendoakan seseorang yang sedang membuatmu merasa kesal atau lelah.',
  formatted_message: `╔═══════☩══♛══☩═══════╗
 ☕ 𝐂𝐎𝐅𝐅𝐄𝐄 𝐁𝐑𝐄𝐀𝐊 𝐖𝐈𝐓𝐇 𝐆𝐎𝐃 ✝️
╚═══════☩══✦══☩═══════╝

📖 𝗩𝗲𝗿𝘀𝗲 𝗼𝗳 𝗧𝗵𝗲 𝗗𝗮𝘆 ⋆⋅☆
Roma 12:2
"Janganlah kamu menjadi serupa dengan dunia ini, tetapi berubahlah oleh pembaruan budimu, sehingga kamu dapat membedakan manakah kehendak Allah: apa yang baik, yang berkenan kepada Allah dan yang sempurna."

💭 𝗧𝗼𝗱𝗮𝘆’ｓ 𝗥𝗲𝗳𝗹𝗲𝗰𝘁𝗶𝗼𝗻 ✧◦°˚°◦♡
Dalam kesibukan harian kita yang sering kali bising dan dipenuhi oleh standar duniawi, Tuhan mengundang kita untuk berhenti sejenak. Memperbarui budi berarti mengarahkan pandangan kita kembali kepada Kristus, menyelaraskan setiap keputusan dan perbuatan dengan firman-Nya.

🧠 𝗠𝗶𝗻𝗱 𝗖𝗵𝗲𝗰𝗸 +✟+
Apakah hari ini tindakanku lebih banyak didorong oleh opini orang sekitar atau kerinduan menyenangkan hati Tuhan?

✨ 𝗧𝗮𝗸𝗲 𝗢𝗻𝗲 𝗦𝘁𝗲𝗽 ⋆ ᭝ ᨳଓ ՟
Ambil jeda 3 menit hari ini untuk mendoakan seseorang yang sedang membuatmu merasa kesal atau lelah.

“𝓞𝓷𝓮 𝓿𝓮𝓻𝓼𝓮.
𝓞𝓷𝓮 𝓻𝓮𝓯𝓵𝓮𝓬𝓽𝓲𝓸𝓷.
𝓞𝓷𝓮 𝓼𝓽𝓮𝓹 𝓬𝓵𝓸𝓼𝓮𝓻 𝓽𝓸 𝓗𝓲𝓶.”`,
  audit_status: 'approved',
  is_fallback_eligible: true,
  last_audited_by: 'Sr. Clara Bernadeth',
  last_audited_at: new Date(Date.now() - 4 * 3600000).toISOString(),
  created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
};

export const INITIAL_SETTINGS: AutomationSettings = {
  devotional_scraping_time: '00:00',
  devotional_broadcast_time: '09:45',
  birthday_broadcast_time: '07:00',
  devotional_fallback_enabled: true,
  birthday_mention_limit: 20,
  timezone: 'Asia/Jakarta',
  devotional_automation_active: true,
  birthday_automation_active: true,
};

export const INITIAL_DELIVERIES: BroadcastDelivery[] = [
  {
    id: 'del_001',
    module: 'devotional',
    reference_id: '99999999-9999-9999-9999-999999999901',
    line_group_id: '55555555-5555-5555-5555-555555555551',
    group_name: 'Grup Inti MP Community',
    delivery_type: 'scheduled',
    sender_channel: 'system_cron',
    sender_name: 'System Scheduler (09:45 WIB)',
    status: 'success',
    idempotency_key: `devotional_${todayIso}_55555555-5555-5555-5555-555555555551`,
    delivered_at: `${todayIso}T09:45:00.000Z`,
  },
  {
    id: 'del_002',
    module: 'birthday',
    reference_id: 'bday_camp_01',
    line_group_id: '55555555-5555-5555-5555-555555555551',
    group_name: 'Grup Inti MP Community',
    delivery_type: 'scheduled',
    sender_channel: 'system_cron',
    sender_name: 'System Scheduler (07:00 WIB)',
    status: 'success',
    idempotency_key: `birthday_${todayIso}_55555555-5555-5555-5555-555555555551`,
    delivered_at: `${todayIso}T07:00:00.000Z`,
  },
  {
    id: 'del_003',
    module: 'devotional',
    reference_id: '99999999-9999-9999-9999-999999999901',
    line_group_id: '55555555-5555-5555-5555-555555555552',
    group_name: 'Grup OMK & Youth MP',
    delivery_type: 'scheduled',
    sender_channel: 'system_cron',
    sender_name: 'System Scheduler (09:45 WIB)',
    status: 'success',
    idempotency_key: `devotional_${todayIso}_55555555-5555-5555-5555-555555555552`,
    delivered_at: `${todayIso}T09:45:02.000Z`,
  },
  {
    id: 'del_004',
    module: 'birthday',
    reference_id: 'bday_camp_02',
    line_group_id: '55555555-5555-5555-5555-555555555552',
    group_name: 'Grup OMK & Youth MP',
    delivery_type: 'manual',
    sender_channel: 'dashboard',
    sender_name: 'Superadmin (Web Studio)',
    status: 'success',
    idempotency_key: `manual_bday_${todayIso}_grp02`,
    delivered_at: `${todayIso}T08:30:15.000Z`,
  },
];

export const INITIAL_LOGS: ActivityLog[] = [
  {
    id: 'log_001',
    user_name: 'System Scheduler',
    actor_type: 'system_scheduler',
    action: 'devotional_scraped',
    entity_type: 'devotional',
    entity_id: '99999999-9999-9999-9999-999999999901',
    details: { source: 'The Katolik', status: 'success' },
    created_at: `${todayIso}T00:00:15.000Z`,
  },
  {
    id: 'log_002',
    user_name: 'Sr. Clara Bernadeth',
    actor_type: 'user',
    action: 'devotional_approved',
    entity_type: 'devotional',
    entity_id: '99999999-9999-9999-9999-999999999901',
    details: { note: 'Konten disetujui untuk siaran 09:45 WIB' },
    created_at: `${todayIso}T08:15:30.000Z`,
  },
  {
    id: 'log_003',
    user_name: 'System Scheduler',
    actor_type: 'system_scheduler',
    action: 'birthday_broadcast_sent',
    entity_type: 'birthday',
    entity_id: 'bday_camp_01',
    details: { group: 'Grup Inti MP Community', recipients: ['Kevin Pratama', 'Angela W', 'Ryan Santoso'], batch: 1 },
    created_at: `${todayIso}T07:00:02.000Z`,
  },
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif_001',
    recipient_role: 'liturgi',
    title: 'Renungan Siap Diaudit',
    message: 'Renungan harian Coffee Break with God hari ini telah selesai diproses oleh LLM dan siap diaudit.',
    type: 'info',
    is_read: false,
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: 'notif_002',
    recipient_role: 'logistik',
    title: '3 Anggota Berulang Tahun Hari Ini',
    message: 'Ucapan ulang tahun telah otomatis dikirimkan ke Grup Inti MP Community dengan LINE mention asli.',
    type: 'success',
    is_read: false,
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: 'notif_003',
    recipient_role: 'logistik',
    title: 'LINE User ID Belum Terdaftar',
    message: 'Anggota Agnes Cindy Lestari belum memiliki LINE User ID yang terverifikasi.',
    type: 'warning',
    is_read: false,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
];
