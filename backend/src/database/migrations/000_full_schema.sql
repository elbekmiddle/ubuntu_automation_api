-- =========================================================
-- TO'LIQ SXEMA — 001_init.sql + 002_devices_audit_versions_schedules.sql
-- Bo'sh (jadval yo'q) bazada bir marta ishga tushiring.
-- =========================================================

-- gen_random_uuid() shu extension'dan keladi — ba'zi Postgres image'larda
-- avtomatik yoqilmagan bo'ladi, shuning uchun ochig'idan-ochiq yoqamiz.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- 001_init.sql ----------

CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    args JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','running','success','failed')),
    pid INTEGER,
    exit_code INTEGER,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE job_logs (
    id BIGSERIAL PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    stream TEXT NOT NULL CHECK (stream IN ('stdout','stderr')),
    chunk TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_template_id ON jobs(template_id);
CREATE INDEX idx_job_logs_job_id ON job_logs(job_id);

-- Eslatma: TemplatesService/JobsRepository kodida `actions` (templates) va
-- pagination uchun boshqa ustunlar ham ishlatiladi — bular avvalgi
-- suhbatlarda qo'shilgan bo'lishi kerak edi, shuning uchun shu yerda ham
-- qo'shib qo'yamiz (bo'lmasa keyingi xatolar shu yerdan chiqadi):
ALTER TABLE templates ADD COLUMN actions JSONB NOT NULL DEFAULT '[]';

-- ---------- 002_devices_audit_versions_schedules.sql ----------

-- Devices: har bir IP/klientni kuzatib boradi
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip TEXT NOT NULL,
    user_agent TEXT,
    first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
    request_count BIGINT NOT NULL DEFAULT 1,
    UNIQUE (ip, user_agent)
);

CREATE INDEX idx_devices_last_seen ON devices(last_seen);

-- Audit log: kim (qaysi device/IP), qachon, nimani qildi
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    ip TEXT NOT NULL,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    action TEXT NOT NULL,          -- masalan: 'job.create', 'template.create', 'file.write'
    resource_type TEXT,            -- 'template' | 'job' | 'file'
    resource_id TEXT,
    status_code INTEGER,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_device_id ON audit_logs(device_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Template versiyalash: har bir o'zgarishdan oldin snapshot saqlaydi
CREATE TABLE template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    manifest JSONB NOT NULL,       -- shu versiyadagi template.json
    files JSONB NOT NULL,          -- { "install.sh": "...", "configure.sh": "..." }
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (template_id, version)
);

CREATE INDEX idx_template_versions_template_id ON template_versions(template_id);

ALTER TABLE templates ADD COLUMN current_version INTEGER NOT NULL DEFAULT 1;

-- Rejalashtirilgan job'lar (BullMQ repeatable job'larning metadatasi)
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    cron TEXT NOT NULL,            -- masalan: '0 3 * * *' (har kuni soat 3da)
    args JSONB NOT NULL DEFAULT '{}',
    enabled BOOLEAN NOT NULL DEFAULT true,
    bullmq_job_key TEXT,           -- BullMQ repeat job'ni o'chirish uchun kerak bo'ladigan kalit
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_schedules_template_id ON schedules(template_id);

-- Jobs jadvaliga: bu job qaysi schedule/device orqali yaratilgani
ALTER TABLE jobs ADD COLUMN schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL;
ALTER TABLE jobs ADD COLUMN device_id UUID REFERENCES devices(id) ON DELETE SET NULL;
