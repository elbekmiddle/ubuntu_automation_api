-- =========================================================
-- SCREENCTL — TO'LIQ SXEMA (001..008 birlashtirilgan)
-- Bo'sh bazada bir marta ishga tushiring.
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ================= 001_init.sql =================

-- Templates
CREATE TABLE IF NOT EXISTS templates (
                                         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );


-- Jobs
CREATE TABLE IF NOT EXISTS jobs (
                                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL
    REFERENCES templates(id)
    ON DELETE CASCADE,
    action TEXT NOT NULL,
    args JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'success', 'failed')),
    pid INTEGER,
    exit_code INTEGER,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );


-- Job logs
CREATE TABLE IF NOT EXISTS job_logs (
                                        id BIGSERIAL PRIMARY KEY,
                                        job_id UUID NOT NULL
                                        REFERENCES jobs(id)
    ON DELETE CASCADE,
    stream TEXT NOT NULL
    CHECK (stream IN ('stdout', 'stderr')),
    chunk TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );


-- Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_template_id
    ON jobs(template_id);

CREATE INDEX IF NOT EXISTS idx_job_logs_job_id
    ON job_logs(job_id);

-- ================= 002_devices_audit_versions_schedules.sql =================

-- Devices: har bir IP/klientni kuzatib boradi
CREATE TABLE IF NOT EXISTS devices (
                                       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip TEXT NOT NULL,
    user_agent TEXT,
    first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
    request_count BIGINT NOT NULL DEFAULT 1,
    UNIQUE (ip, user_agent)
    );

CREATE INDEX IF NOT EXISTS idx_devices_last_seen
    ON devices(last_seen);


-- Audit log: kim (qaysi device/IP), qachon, nimani qildi
CREATE TABLE IF NOT EXISTS audit_logs (
                                          id BIGSERIAL PRIMARY KEY,
                                          device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    ip TEXT NOT NULL,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    status_code INTEGER,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
    ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_device_id
    ON audit_logs(device_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
    ON audit_logs(resource_type, resource_id);


-- Template versiyalash
CREATE TABLE IF NOT EXISTS template_versions (
                                                 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    manifest JSONB NOT NULL,
    files JSONB NOT NULL,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (template_id, version)
    );

CREATE INDEX IF NOT EXISTS idx_template_versions_template_id
    ON template_versions(template_id);


-- Templates: current version
ALTER TABLE templates
    ADD COLUMN IF NOT EXISTS current_version INTEGER NOT NULL DEFAULT 1;


-- Rejalashtirilgan job'lar
CREATE TABLE IF NOT EXISTS schedules (
                                         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    cron TEXT NOT NULL,
    args JSONB NOT NULL DEFAULT '{}',
    enabled BOOLEAN NOT NULL DEFAULT true,
    bullmq_job_key TEXT,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE INDEX IF NOT EXISTS idx_schedules_template_id
    ON schedules(template_id);


-- Jobs: schedule va device
ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS schedule_id UUID
    REFERENCES schedules(id)
    ON DELETE SET NULL;

ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS device_id UUID
    REFERENCES devices(id)
    ON DELETE SET NULL;

-- ================= 003_auth.sql =================

CREATE TABLE IF NOT EXISTS users (
                                     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE TABLE IF NOT EXISTS refresh_tokens (
                                              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
    ON refresh_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
    ON refresh_tokens(expires_at);

ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS user_id UUID
    REFERENCES users(id)
    ON DELETE SET NULL;

-- ================= 004_template_visibility.sql =================

-- Templates endi foydalanuvchiga tegishli bo'lishi va jamoatchilikka ochiq
-- (is_public) qilib belgilanishi mumkin — "community" galereyasi uchun asos.

ALTER TABLE templates
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE templates
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Diskdan sync qilingan (o'zi bilan kelgan) templatelar hammaga ko'rinadigan
-- bo'lib qolsin — bular platformaning "built-in" namunalari.
UPDATE templates SET is_public = true WHERE owner_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_templates_is_public ON templates(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_templates_owner_id ON templates(owner_id);


-- ================= 005_apps.sql =================

-- =========================================================
-- APPS — foydalanuvchi ulagan kompyuterlar/agentlar
-- (AppsRepository shu jadvalga tayanadi, lekin u hech qaysi
--  avvalgi migration'da yaratilmagan edi — shu sabab
--  "relation apps does not exist" xatosi chiqqan)
-- =========================================================

CREATE TABLE IF NOT EXISTS apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    name TEXT NOT NULL,

    -- Faqat hash saqlanadi — asl registration token faqat "app create"
    -- javobida bir marta ko'rsatiladi (AppsService.create bilan mos).
    registration_token_hash TEXT NOT NULL UNIQUE,

    status TEXT NOT NULL DEFAULT 'offline'
        CHECK (status IN ('offline', 'online')),

    last_seen_at TIMESTAMPTZ,

    hostname TEXT,
    os_platform TEXT,
    os_release TEXT,

    -- Agentdan kelgan oxirgi heartbeat metrikalari (cpu/memory/disk va h.k.)
    last_metrics JSONB NOT NULL DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_apps_user_id ON apps(user_id);
CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);
CREATE INDEX IF NOT EXISTS idx_apps_last_seen_at ON apps(last_seen_at DESC);


-- ================= 006_apps_permission.sql =================

-- Har bir App (ulangan qurilma) uchun ruxsat darajasi. MVP uchun ikkita
-- soddalashtirilgan daraja: 'read_only' (faqat monitoring) va 'read_write'
-- (monitoring + template/action ijrosi). Kelajakda granular permission
-- ro'yxati (masalan JSONB) kerak bo'lsa shu ustunni almashtiramiz.
ALTER TABLE apps ADD COLUMN IF NOT EXISTS permission TEXT NOT NULL DEFAULT 'read_write'
    CHECK (permission IN ('read_only', 'read_write'));


-- ================= 007_jobs_app_routing.sql =================

-- Job qaysi App (agent) orqali ishga tushirilganini bildiradi. NULL bo'lsa —
-- job backend mashinasining o'zida (local spawn) ishlaydi, xuddi hozirgidek.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS app_id UUID REFERENCES apps(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_app_id ON jobs(app_id);


-- ================= 008_apps_machine_id.sql =================

-- Bitta fizik mashina uchun barqaror identifikator (CLI'da ~/.screenctl/machine-id
-- faylida saqlanadi). Shu orqali "app connect" qayta chaqirilganda (masalan
-- credential fayl yo'qolib, lekin machine-id qolgan bo'lsa) yangi App
-- yaratilmaydi — mavjudiga qayta ulanadi.
ALTER TABLE apps ADD COLUMN IF NOT EXISTS machine_id TEXT;

-- Global emas — bitta user ikkita machine_id'ga ega bo'lishi normal,
-- lekin BIR xil user BIR xil machine_id bilan ikkita App yaratmasin.
CREATE UNIQUE INDEX IF NOT EXISTS idx_apps_user_machine_unique
    ON apps(user_id, machine_id) WHERE machine_id IS NOT NULL;

