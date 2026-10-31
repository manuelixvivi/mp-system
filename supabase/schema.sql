-- ====================================================================
-- MP CONTROL SYSTEM - DATABASE SCHEMA (v1.0 Final)
-- Platform: Supabase PostgreSQL (Asia/Jakarta WIB)
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Dashboard accounts & LINE linkage)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('superadmin', 'liturgi', 'logistik')),
    line_user_id VARCHAR(100) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. LINE BOTS (Channel configuration & secrets)
CREATE TABLE IF NOT EXISTS line_bots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    channel_id VARCHAR(100) NOT NULL,
    channel_secret TEXT NOT NULL,
    channel_access_token TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error')),
    webhook_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. LINE GROUPS (Registered target groups)
CREATE TABLE IF NOT EXISTS line_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id VARCHAR(100) UNIQUE NOT NULL,
    group_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    assigned_modules JSONB DEFAULT '["devotional", "birthday"]'::jsonb,
    member_count INT DEFAULT 0,
    bot_joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. MEMBERS (MP Community members with birth dates)
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    birth_date INT NOT NULL CHECK (birth_date BETWEEN 1 AND 31),
    birth_month INT NOT NULL CHECK (birth_month BETWEEN 1 AND 12),
    birth_year INT,
    line_user_id VARCHAR(100),
    line_display_name VARCHAR(255),
    line_verification_status VARCHAR(50) DEFAULT 'unverified' CHECK (line_verification_status IN ('verified', 'unverified', 'not_set')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. MEMBER LINE ACCOUNTS (Audit trail of linked accounts)
CREATE TABLE IF NOT EXISTS member_line_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    line_user_id VARCHAR(100) NOT NULL,
    line_display_name VARCHAR(255),
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verification_method VARCHAR(50) DEFAULT 'manual' CHECK (verification_method IN ('manual', 'qr', 'link')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. BIRTHDAY GROUP ASSIGNMENTS (Member to LINE Group mapping)
CREATE TABLE IF NOT EXISTS birthday_group_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    line_group_id UUID REFERENCES line_groups(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (member_id, line_group_id)
);

-- 7. BIRTHDAY BROADCASTS (Group birthday campaign per date)
CREATE TABLE IF NOT EXISTS birthday_broadcasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broadcast_date DATE NOT NULL,
    line_group_id UUID REFERENCES line_groups(id) ON DELETE RESTRICT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
    total_members INT DEFAULT 0,
    total_batches INT DEFAULT 1,
    trigger_type VARCHAR(50) DEFAULT 'automated' CHECK (trigger_type IN ('automated', 'manual')),
    triggered_by_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    executed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (broadcast_date, line_group_id)
);

-- 8. BIRTHDAY BROADCAST MESSAGES (Individual message batches per campaign)
CREATE TABLE IF NOT EXISTS birthday_broadcast_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    birthday_broadcast_id UUID REFERENCES birthday_broadcasts(id) ON DELETE CASCADE,
    batch_number INT NOT NULL DEFAULT 1,
    format_type VARCHAR(20) NOT NULL CHECK (format_type IN ('full', 'short')),
    message_text TEXT NOT NULL,
    mentions_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    recipient_count INT NOT NULL DEFAULT 0,
    line_message_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (birthday_broadcast_id, batch_number)
);

-- 9. BIRTHDAY BROADCAST MEMBERS (Mentioned recipients in each batch)
CREATE TABLE IF NOT EXISTS birthday_broadcast_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    birthday_broadcast_id UUID REFERENCES birthday_broadcasts(id) ON DELETE CASCADE,
    birthday_broadcast_message_id UUID REFERENCES birthday_broadcast_messages(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE RESTRICT,
    line_user_id VARCHAR(100) NOT NULL,
    mention_index INT NOT NULL,
    delivery_status VARCHAR(50) DEFAULT 'success' CHECK (delivery_status IN ('success', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (birthday_broadcast_id, member_id)
);

-- 10. DEVOTIONAL SOURCES (The Katolik raw scraped articles)
CREATE TABLE IF NOT EXISTS devotional_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_date DATE UNIQUE NOT NULL,
    source_url TEXT NOT NULL,
    raw_title TEXT,
    raw_content TEXT,
    scraping_status VARCHAR(50) DEFAULT 'pending' CHECK (scraping_status IN ('pending', 'success', 'failed')),
    error_details TEXT,
    scraped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. DEVOTIONALS (Structured Coffee Break with God devotionals)
CREATE TABLE IF NOT EXISTS devotionals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    devotional_date DATE UNIQUE NOT NULL,
    source_id UUID REFERENCES devotional_sources(id) ON DELETE SET NULL,
    verse_reference TEXT NOT NULL,
    verse_text TEXT NOT NULL,
    reflection TEXT NOT NULL,
    mind_check TEXT NOT NULL,
    take_one_step TEXT NOT NULL,
    formatted_message TEXT NOT NULL,
    audit_status VARCHAR(50) DEFAULT 'pending' CHECK (audit_status IN ('pending', 'approved', 'revision_required', 'rejected')),
    is_fallback_eligible BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. DEVOTIONAL REVISIONS (Audit revision histories)
CREATE TABLE IF NOT EXISTS devotional_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    devotional_id UUID REFERENCES devotionals(id) ON DELETE CASCADE,
    editor_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    previous_content JSONB NOT NULL,
    updated_content JSONB NOT NULL,
    change_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. DEVOTIONAL AUDITS (Approval, rejection, revision events)
CREATE TABLE IF NOT EXISTS devotional_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    devotional_id UUID REFERENCES devotionals(id) ON DELETE CASCADE,
    auditor_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('approve', 'request_revision', 'reject', 'fallback_auto_approved')),
    audit_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. AUTOMATION SETTINGS (Configurable schedule & behavior)
CREATE TABLE IF NOT EXISTS automation_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. SCHEDULED JOBS (Queue & idempotency registry)
CREATE TABLE IF NOT EXISTS scheduled_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type VARCHAR(100) NOT NULL CHECK (job_type IN ('devotional_scrape', 'devotional_broadcast', 'birthday_broadcast')),
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped', 'cancelled')),
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    last_error TEXT,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    executed_at TIMESTAMP WITH TIME ZONE
);

-- 16. BROADCAST DELIVERIES (Unified broadcast history)
CREATE TABLE IF NOT EXISTS broadcast_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module VARCHAR(50) NOT NULL CHECK (module IN ('devotional', 'birthday')),
    reference_id UUID NOT NULL,
    line_group_id UUID REFERENCES line_groups(id) ON DELETE RESTRICT,
    delivery_type VARCHAR(50) DEFAULT 'scheduled' CHECK (delivery_type IN ('scheduled', 'manual', 'fallback')),
    sender_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    sender_channel VARCHAR(50) DEFAULT 'system_cron' CHECK (sender_channel IN ('dashboard', 'line_chat', 'system_cron')),
    status VARCHAR(50) DEFAULT 'success' CHECK (status IN ('success', 'failed')),
    error_message TEXT,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. ACTIVITY LOGS (Comprehensive system audit log)
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    actor_type VARCHAR(50) NOT NULL CHECK (actor_type IN ('user', 'line_bot', 'system_scheduler')),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 18. NOTIFICATIONS (Dashboard notification center)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_role VARCHAR(50) NOT NULL CHECK (recipient_role IN ('superadmin', 'liturgi', 'logistik', 'all')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_members_birthday ON members(birth_month, birth_date);
CREATE INDEX IF NOT EXISTS idx_devotionals_date ON devotionals(devotional_date);
CREATE INDEX IF NOT EXISTS idx_birthday_broadcasts_date ON birthday_broadcasts(broadcast_date);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_line_user_id ON profiles(line_user_id);
