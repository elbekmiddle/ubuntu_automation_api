-- `jobs` jadvali shu vaqtgacha HECH QANDAY egalik konsepsiyasiga ega
-- emas edi: `JobsController`da auth guard umuman yo'q edi va
-- `findAll`/`findOne`/`findLogs` hech qanday userId bo'yicha filtrlanmas
-- edi — ya'ni har qanday (hatto login qilmagan) so'rov boshqa
-- foydalanuvchilarning BARCHA job'larini, shu jumladan args va
-- loglarini ko'ra olardi. Bu migratsiya + tegishli backend
-- o'zgarishlari buni tuzatadi.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_user ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_organization ON jobs(organization_id);

-- Backfill: appId orqali yaratilgan eski job'lar uchun — o'sha device'ning
-- egasi/tashkilotidan meros qilib olamiz. appId'siz (local, shablon
-- asosidagi) eski job'lar egasiz qoladi (user_id NULL) — buni oldindan
-- bilib bo'lmaydi, keyingi yozuvlar esa to'g'ri egaga ega bo'ladi.
UPDATE jobs j
SET user_id = a.user_id, organization_id = a.organization_id
FROM apps a
WHERE j.app_id = a.id AND j.user_id IS NULL;

-- `apps.organization_id` — 010-migratsiya faqat O'SHA PAYTDA mavjud
-- bo'lgan device'larni backfill qilgan edi. Shu orqadan qolgan (masalan
-- migratsiyadan keyin, lekin bu tuzatishdan oldin ulangan) device'lar
-- bo'lsa, ularni ham egasining shaxsiy workspace'iga bog'laymiz — shunda
-- "org_id bo'yicha to'liq scope" hech qanday orfan device qoldirmaydi.
UPDATE apps a
SET organization_id = (
    SELECT om.organization_id FROM organization_members om
    WHERE om.user_id = a.user_id AND om.role = 'owner'
    ORDER BY om.created_at ASC
    LIMIT 1
)
WHERE a.organization_id IS NULL;
