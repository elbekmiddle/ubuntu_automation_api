-- Job qaysi App (agent) orqali ishga tushirilganini bildiradi. NULL bo'lsa —
-- job backend mashinasining o'zida (local spawn) ishlaydi, xuddi hozirgidek.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS app_id UUID REFERENCES apps(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_app_id ON jobs(app_id);
