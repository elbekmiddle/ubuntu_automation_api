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