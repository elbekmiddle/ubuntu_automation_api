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