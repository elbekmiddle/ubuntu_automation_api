-- Har bir App (ulangan qurilma) uchun ruxsat darajasi. MVP uchun ikkita
-- soddalashtirilgan daraja: 'read_only' (faqat monitoring) va 'read_write'
-- (monitoring + template/action ijrosi). Kelajakda granular permission
-- ro'yxati (masalan JSONB) kerak bo'lsa shu ustunni almashtiramiz.
ALTER TABLE apps ADD COLUMN IF NOT EXISTS permission TEXT NOT NULL DEFAULT 'read_write'
    CHECK (permission IN ('read_only', 'read_write'));
