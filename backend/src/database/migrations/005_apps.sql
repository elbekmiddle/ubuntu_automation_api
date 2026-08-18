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
