-- Target selector (fleet automation) uchun — device'larni erkin teglar
-- bilan guruhlash: "production", "developer", "windows-11" va h.k.
-- Massiv ustun tanlandi (alohida "tags" jadvali emas), chunki tegning o'zi
-- boshqa hech qanday metadata (rang, tavsif) olib yurmaydi — shunchaki
-- filtrlash uchun yorliq. Kelajakda organization-darajasidagi umumiy teg
-- ro'yxati kerak bo'lsa, shunda alohida jadvalga ko'chirish oson.
ALTER TABLE apps ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- Teg bo'yicha filtrlash (`tags @> ARRAY[...]` yoki `tags && ARRAY[...]`)
-- tez ishlashi uchun GIN indeks.
CREATE INDEX IF NOT EXISTS idx_apps_tags ON apps USING GIN (tags);
