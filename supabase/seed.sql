-- ====================================================================
-- MP CONTROL SYSTEM - SEED DATA
-- Platform: Supabase PostgreSQL (Asia/Jakarta WIB)
-- ====================================================================

-- 1. PROFILES
INSERT INTO profiles (id, email, name, role, line_user_id, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'superadmin@mpcommunity.org', 'Fr. Michael Tan (Superadmin)', 'superadmin', 'U_SUPERADMIN_001', true),
('22222222-2222-2222-2222-222222222222', 'liturgi@mpcommunity.org', 'Sr. Clara Bernadeth (Tim Liturgi)', 'liturgi', 'U_LITURGI_002', true),
('33333333-3333-3333-3333-333333333333', 'logistik@mpcommunity.org', 'Antonius Budi (Tim Logistik)', 'logistik', 'U_LOGISTIK_003', true)
ON CONFLICT (id) DO NOTHING;

-- 2. LINE BOTS
INSERT INTO line_bots (id, name, channel_id, channel_secret, channel_access_token, is_active, status, webhook_url) VALUES
('44444444-4444-4444-4444-444444444444', 'MP Community Official Bot', '2006123456', 'sec_9876543210abcdef9876543210ab', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_access_token', true, 'connected', 'https://mp-control.vercel.app/api/line/webhook')
ON CONFLICT (id) DO NOTHING;

-- 3. LINE GROUPS
INSERT INTO line_groups (id, group_id, group_name, description, is_active, assigned_modules, member_count) VALUES
('55555555-5555-5555-5555-555555555551', 'c-mp-inti-001', 'Grup Inti MP Community', 'Grup utama seluruh anggota komunitas MP', true, '["devotional", "birthday"]'::jsonb, 48),
('55555555-5555-5555-5555-555555555552', 'c-mp-youth-002', 'Grup OMK & Youth MP', 'Grup pemuda dan remaja MP', true, '["devotional", "birthday"]'::jsonb, 35),
('55555555-5555-5555-5555-555555555553', 'c-mp-pengurus-003', 'Grup Pengurus & Pelayan MP', 'Grup koordinasi pengurus & panitia', true, '["devotional"]'::jsonb, 18)
ON CONFLICT (id) DO NOTHING;

-- 4. MEMBERS
INSERT INTO members (id, full_name, birth_date, birth_month, birth_year, line_user_id, line_display_name, line_verification_status, status, notes) VALUES
('66666666-6666-6666-6666-666666666601', 'Alexander Kevin Pratama', 30, 10, 1998, 'U_MEMBER_KEVIN_01', 'Kevin Pratama', 'verified', 'active', 'Koordinator Sie Acara'),
('66666666-6666-6666-6666-666666666602', 'Theresia Angela Wijaya', 30, 10, 2001, 'U_MEMBER_ANGELA_02', 'Angela W', 'verified', 'active', 'Tim Paduan Suara'),
('66666666-6666-6666-6666-666666666603', 'Benedictus Ryan Santoso', 30, 10, 1995, 'U_MEMBER_RYAN_03', 'Ryan Santoso', 'verified', 'active', 'Anggota Komunitas'),
('66666666-6666-6666-6666-666666666604', 'Maria Natalia Kusumawati', 31, 10, 1997, 'U_MEMBER_NATALIA_04', 'Natalia K', 'verified', 'active', 'Sekretaris'),
('66666666-6666-6666-6666-666666666605', 'Ignatius Dimas Prasetyo', 1, 11, 2000, 'U_MEMBER_DIMAS_05', 'Dimas Prasetyo', 'verified', 'active', 'Tim Multimedia'),
('66666666-6666-6666-6666-666666666606', 'Agnes Cindy Lestari', 2, 11, 1999, 'U_MEMBER_CINDY_06', 'Cindy L', 'unverified', 'active', 'Menunggu konfirmasi LINE ID'),
('66666666-6666-6666-6666-666666666607', 'Gabriel Jonathan Hartono', 15, 11, 2002, 'U_MEMBER_JONATHAN_07', 'Jonathan H', 'verified', 'active', 'Seksi Perlengkapan')
ON CONFLICT (id) DO NOTHING;

-- 5. BIRTHDAY GROUP ASSIGNMENTS
INSERT INTO birthday_group_assignments (id, member_id, line_group_id, is_primary) VALUES
('77777777-7777-7777-7777-777777777701', '66666666-6666-6666-6666-666666666601', '55555555-5555-5555-5555-555555555551', true),
('77777777-7777-7777-7777-777777777702', '66666666-6666-6666-6666-666666666602', '55555555-5555-5555-5555-555555555551', true),
('77777777-7777-7777-7777-777777777703', '66666666-6666-6666-6666-666666666603', '55555555-5555-5555-5555-555555555551', true),
('77777777-7777-7777-7777-777777777704', '66666666-6666-6666-6666-666666666604', '55555555-5555-5555-5555-555555555551', true),
('77777777-7777-7777-7777-777777777705', '66666666-6666-6666-6666-666666666605', '55555555-5555-5555-5555-555555555552', true),
('77777777-7777-7777-7777-777777777706', '66666666-6666-6666-6666-666666666606', '55555555-5555-5555-5555-555555555552', true),
('77777777-7777-7777-7777-777777777707', '66666666-6666-6666-6666-666666666607', '55555555-5555-5555-5555-555555555551', true)
ON CONFLICT (id) DO NOTHING;

-- 6. DEVOTIONAL SOURCES
INSERT INTO devotional_sources (id, target_date, source_url, raw_title, raw_content, scraping_status, scraped_at) VALUES
('88888888-8888-8888-8888-888888888801', CURRENT_DATE, 'https://www.thekatolik.com/2026/10/renungan-harian-katolik-hari-ini.html', 'Renungan Harian Katolik: Mengasihi Tanpa Syarat', 'Bacaan Injil hari ini mengingatkan kita akan kasih karunia Tuhan yang tak pernah berkesudahan...', 'success', NOW() - INTERVAL '6 hours')
ON CONFLICT (target_date) DO NOTHING;

-- 7. DEVOTIONALS (Coffee Break with God format)
INSERT INTO devotionals (id, devotional_date, source_id, verse_reference, verse_text, reflection, mind_check, take_one_step, formatted_message, audit_status, is_fallback_eligible) VALUES
('99999999-9999-9999-9999-999999999901', CURRENT_DATE, '88888888-8888-8888-8888-888888888801', 'Roma 12:2', 'Janganlah kamu menjadi serupa dengan dunia ini, tetapi berubahlah oleh pembaruan budimu, sehingga kamu dapat membedakan manakah kehendak Allah: apa yang baik, yang berkenan kepada Allah dan yang sempurna.', 'Dalam kesibukan harian kita yang sering kali bising dan dipenuhi oleh standar duniawi, Tuhan mengundang kita untuk berhenti sejenak. Memperbarui budi berarti mengarahkan pandangan kita kembali kepada Kristus, menyelaraskan setiap keputusan dan perbuatan dengan firman-Nya.', 'Apakah hari ini tindakanku lebih banyak didorong oleh opini orang sekitar atau kerinduan menyenangkan hati Tuhan?', 'Ambil jeda 3 menit hari ini untuk mendoakan seseorang yang sedang membuatmu merasa kesal atau lelah.',
'╔═══════☩══♛══☩═══════╗
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
𝓞𝓷𝓮 𝓼𝓽𝓮𝓹 𝓬𝓵𝓸𝓼𝓮𝓻 𝓽𝓸 𝓗𝓲𝓶.”', 'approved', true)
ON CONFLICT (devotional_date) DO NOTHING;

-- 8. AUTOMATION SETTINGS
INSERT INTO automation_settings (setting_key, setting_value, description) VALUES
('devotional_scraping_time', '"00:00"'::jsonb, 'Jadwal harian scraping renungan The Katolik (WIB)'),
('devotional_broadcast_time', '"09:45"'::jsonb, 'Jadwal harian pengiriman renungan ke grup LINE (WIB)'),
('birthday_broadcast_time', '"07:00"'::jsonb, 'Jadwal harian pengiriman ucapan ulang tahun (WIB)'),
('devotional_fallback_enabled', 'true'::jsonb, 'Apakah renungan pending audit otomatis dikirim jika lolos validasi pada 09:45 WIB'),
('birthday_mention_limit', '20'::jsonb, 'Batas maksimal LINE mention per batch pesan textV2'),
('timezone', '"Asia/Jakarta"'::jsonb, 'Timezone resmi sistem (WIB)')
ON CONFLICT (setting_key) DO NOTHING;

-- 9. ACTIVITY LOGS
INSERT INTO activity_logs (user_id, actor_type, action, entity_type, entity_id, details) VALUES
('11111111-1111-1111-1111-111111111111', 'user', 'system_initialized', 'system', 'sys_01', '{"event": "MP Control System v1.0 initial seed loaded"}'::jsonb),
('22222222-2222-2222-2222-222222222222', 'user', 'devotional_approved', 'devotional', '99999999-9999-9999-9999-999999999901', '{"status": "approved", "note": "Renungan hari ini telah disetujui Liturgi"}'::jsonb);
