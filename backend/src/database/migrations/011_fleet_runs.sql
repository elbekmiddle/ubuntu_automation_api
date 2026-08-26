-- Fleet automation'ning persisted tarixi. Ilgari `/fleet` sahifasi
-- butunlay client-side edi (natijalar faqat React state'da — sahifa
-- yopilsa yoki reload bo'lsa umumiy "N tadan M tasi tugadi" ko'rinishi
-- yo'qolardi, garchi har bir job o'zi backend'da davom etsa ham). Bu
-- ikkita jadval shu holatni serverga ko'chiradi: bitta "fleet run" —
-- bitta shablon+action'ni bir nechta device'da bir vaqtda ishga tushirish
-- — va uning har bir device uchun alohida natijasi (target).
CREATE TABLE IF NOT EXISTS fleet_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    template_id UUID NOT NULL
        REFERENCES templates(id)
        ON DELETE CASCADE,
    -- Slug'ni ham saqlaymiz (denormalizatsiya) — shablon keyinchalik
    -- o'zgartirilsa/o'chirilsa ham eski run tarixida qaysi shablon
    -- ishlatilgani aniq ko'rinib tursin.
    template_slug TEXT NOT NULL,
    action TEXT NOT NULL,
    args JSONB NOT NULL DEFAULT '{}',

    target_count INT NOT NULL DEFAULT 0,
    -- 'running'  — hali kamida bitta target pending/running holatida
    -- 'completed' — barcha target'lar terminal holatga yetgan (success/failed/offline/error)
    status TEXT NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'completed')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fleet_runs_user ON fleet_runs(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS fleet_run_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    fleet_run_id UUID NOT NULL
        REFERENCES fleet_runs(id)
        ON DELETE CASCADE,

    -- `apps.id`ga ON DELETE SET NULL — device keyinchalik disconnect/remove
    -- qilinsa ham fleet run tarixi buzilmasin (shuning uchun `app_name`
    -- alohida, denormalized ustun sifatida ham saqlanadi).
    app_id UUID REFERENCES apps(id) ON DELETE SET NULL,
    app_name TEXT NOT NULL,

    -- `jobs.id`ga ON DELETE SET NULL — job jadvali tozalansa ham target
    -- yozuvi (va oxirgi ma'lum statusi) qolaveradi.
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

    -- 'offline' — run boshlanganda device offline edi, job umuman
    --             yaratilmagan.
    -- 'error'   — job yaratishga urinilganda backend xato qaytardi
    --             (masalan device orada disconnect bo'lib ulgurdi).
    -- Qolganlari `jobs.status` bilan bir xil ma'noda.
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'success', 'failed', 'offline', 'error')),
    error_message TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fleet_run_targets_run ON fleet_run_targets(fleet_run_id);
CREATE INDEX IF NOT EXISTS idx_fleet_run_targets_job ON fleet_run_targets(job_id) WHERE job_id IS NOT NULL;
