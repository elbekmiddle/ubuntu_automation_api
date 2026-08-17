-- =========================================================
-- FULL INITIAL SCHEMA
-- Bo'sh PostgreSQL bazada ishga tushiriladi.
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- =========================================================
-- TEMPLATES
-- =========================================================

CREATE TABLE IF NOT EXISTS templates (
                                         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    path TEXT NOT NULL,
    actions JSONB NOT NULL DEFAULT '[]',
    current_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );


-- =========================================================
-- JOBS
-- =========================================================

CREATE TABLE IF NOT EXISTS jobs (
                                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    template_id UUID NOT NULL
    REFERENCES templates(id)
    ON DELETE CASCADE,

    action TEXT NOT NULL,

    args JSONB NOT NULL DEFAULT '{}',

    status TEXT NOT NULL DEFAULT 'pending'
    CHECK (
              status IN (
              'pending',
              'running',
              'success',
              'failed'
                        )
    ),

    pid INTEGER,
    exit_code INTEGER,

    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );


-- =========================================================
-- JOB LOGS
-- =========================================================

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


CREATE INDEX IF NOT EXISTS idx_jobs_template_id
    ON jobs(template_id);

CREATE INDEX IF NOT EXISTS idx_job_logs_job_id
    ON job_logs(job_id);


-- =========================================================
-- DEVICES
-- =========================================================

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


-- =========================================================
-- AUDIT LOGS
-- =========================================================

CREATE TABLE IF NOT EXISTS audit_logs (
                                          id BIGSERIAL PRIMARY KEY,

                                          device_id UUID
                                          REFERENCES devices(id)
    ON DELETE SET NULL,

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


-- =========================================================
-- TEMPLATE VERSIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS template_versions (
                                                 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    template_id UUID NOT NULL
    REFERENCES templates(id)
    ON DELETE CASCADE,

    version INTEGER NOT NULL,

    manifest JSONB NOT NULL,

    files JSONB NOT NULL,

    device_id UUID
    REFERENCES devices(id)
    ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (template_id, version)
    );


CREATE INDEX IF NOT EXISTS idx_template_versions_template_id
    ON template_versions(template_id);


-- =========================================================
-- SCHEDULES
-- =========================================================

CREATE TABLE IF NOT EXISTS schedules (
                                         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    template_id UUID NOT NULL
    REFERENCES templates(id)
    ON DELETE CASCADE,

    action TEXT NOT NULL,

    cron TEXT NOT NULL,

    args JSONB NOT NULL DEFAULT '{}',

    enabled BOOLEAN NOT NULL DEFAULT true,

    bullmq_job_key TEXT,

    device_id UUID
    REFERENCES devices(id)
    ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );


CREATE INDEX IF NOT EXISTS idx_schedules_template_id
    ON schedules(template_id);


-- =========================================================
-- JOB RELATIONS
-- =========================================================

ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS schedule_id UUID
    REFERENCES schedules(id)
    ON DELETE SET NULL;

ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS device_id UUID
    REFERENCES devices(id)
    ON DELETE SET NULL;