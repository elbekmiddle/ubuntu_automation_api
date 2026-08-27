-- Fleet automation (README "Navbatda"): "N ta mashinada shu commandni
-- bajar" — bitta so'rov bilan ko'p device'ga job tarqatish, progress'ni
-- (success/failed/offline) kuzatish.
--
-- Har bir target'ning JONLI ijro holati (pending/running/success/failed)
-- alohida ustunda saqlanmaydi — mavjud `jobs` jadvaliga LEFT JOIN orqali
-- olinadi (bitta manba, ikkita joyda status yangilash sinxronizatsiya
-- muammosini oldini oladi). `dispatch_status` faqat "job UMUMAN
-- yaratildimi" degan savolga javob beradi: device dispatch payti offline
-- bo'lsa job yaratilmaydi, shuning uchun bu holatlarni alohida belgilash
-- kerak.

CREATE TABLE IF NOT EXISTS fleet_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    args JSONB NOT NULL DEFAULT '{}',
    -- Fleet run yaratilishida DeviceSelector'da tanlangan kriteriya —
    -- audit/tarix uchun ("bu run qaysi filtr bo'yicha tanlangan edi").
    device_filter JSONB NOT NULL DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fleet_run_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fleet_run_id UUID NOT NULL REFERENCES fleet_runs(id) ON DELETE CASCADE,
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    -- NULL = dispatch payti job yaratilmadi (device offline edi yoki xato
    -- chiqdi) — pastdagi dispatch_status/error shu holatni tushuntiradi.
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    dispatch_status TEXT NOT NULL DEFAULT 'dispatched'
        CHECK (dispatch_status IN ('dispatched', 'offline', 'error')),
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fleet_run_targets_run ON fleet_run_targets(fleet_run_id);
CREATE INDEX IF NOT EXISTS idx_fleet_runs_created_by ON fleet_runs(created_by);
