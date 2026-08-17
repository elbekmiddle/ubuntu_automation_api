-- Templates endi foydalanuvchiga tegishli bo'lishi va jamoatchilikka ochiq
-- (is_public) qilib belgilanishi mumkin — "community" galereyasi uchun asos.

ALTER TABLE templates
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE templates
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Diskdan sync qilingan (o'zi bilan kelgan) templatelar hammaga ko'rinadigan
-- bo'lib qolsin — bular platformaning "built-in" namunalari.
UPDATE templates SET is_public = true WHERE owner_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_templates_is_public ON templates(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_templates_owner_id ON templates(owner_id);
