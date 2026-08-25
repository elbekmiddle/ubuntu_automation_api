-- Organizations / Teams + RBAC (README "Navbatda")
--
-- Har bir user ro'yxatdan o'tganda o'zining shaxsiy tashkiloti bilan
-- boshlaydi ("<name>'s workspace") — shu orqali mavjud (org tushunchasi
-- kiritilishidan oldingi) foydalanuvchilar va apps'lar uchun ham
-- backward-compatible: hech kim majburiy "org yarating" oqimidan
-- o'tmaydi, lekin tizim boshidanoq multi-tenant.

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    -- Tashkilotni yaratgan (va uni o'chira oladigan yagona) user.
    -- Owner boshqa memberlarga rolni topshirsa ham, bu ustun o'zgarmaydi —
    -- "haqiqiy egasi kim" degan savolga har doim aniq javob bo'lishi uchun.
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RBAC: owner > admin > developer > operator > viewer.
-- `user_id` NULL bo'lishi mumkin — email orqali taklif qilingan, lekin
-- hali ro'yxatdan o'tmagan odam uchun ("pending" invite). Ro'yxatdan
-- o'tganda backend shu emailga mos pending qatorni user_id bilan
-- bog'laydi (qarang: OrganizationsService.linkPendingInvites).
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'developer', 'operator', 'viewer')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending')),
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);

-- Devicelar (apps) endi tashkilotga tegishli bo'lishi mumkin. NULL —
-- eski/shaxsiy device (org tanlanmagan). Fleet automation va boshqa
-- jamoaviy funksiyalar org_id bo'yicha ishlaydi.
ALTER TABLE apps ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_apps_organization ON apps(organization_id);

-- Backfill: mavjud har bir user uchun shaxsiy tashkilot yaratamiz, o'zini
-- 'owner' sifatida a'zo qilamiz, va uning barcha mavjud apps'larini shu
-- tashkilotga bog'laymiz — shunda deploy qilingan zahoti hech narsa
-- "egasiz" qolmaydi.
DO $$
DECLARE
    u RECORD;
    new_org_id UUID;
BEGIN
    FOR u IN SELECT id, email, name FROM users LOOP
        IF NOT EXISTS (SELECT 1 FROM organization_members WHERE user_id = u.id AND role = 'owner') THEN
            INSERT INTO organizations (name, owner_user_id)
            VALUES (COALESCE(u.name, split_part(u.email, '@', 1)) || '''s workspace', u.id)
            RETURNING id INTO new_org_id;

            INSERT INTO organization_members (organization_id, user_id, email, role, status)
            VALUES (new_org_id, u.id, u.email, 'owner', 'active');

            UPDATE apps SET organization_id = new_org_id WHERE user_id = u.id AND organization_id IS NULL;
        END IF;
    END LOOP;
END $$;
