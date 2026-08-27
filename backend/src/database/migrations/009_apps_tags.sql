-- Target selector (DeviceSelector: platform, tags, os version, online holati
-- bo'yicha) uchun poydevor — devicelarga erkin tag qo'yish imkoniyati.
-- Fleet automation (README "Navbatda") shu tag'lar orqali qurilma
-- guruhlarini tanlaydi (masalan "prod", "staging", "gpu").
ALTER TABLE apps ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- Tag bo'yicha filtrlash (`tags @> ARRAY['prod']`) tezroq ishlashi uchun.
CREATE INDEX IF NOT EXISTS idx_apps_tags ON apps USING GIN (tags);
