-- Bitta fizik mashina uchun barqaror identifikator (CLI'da ~/.screenctl/machine-id
-- faylida saqlanadi). Shu orqali "app connect" qayta chaqirilganda (masalan
-- credential fayl yo'qolib, lekin machine-id qolgan bo'lsa) yangi App
-- yaratilmaydi — mavjudiga qayta ulanadi.
ALTER TABLE apps ADD COLUMN IF NOT EXISTS machine_id TEXT;

-- Global emas — bitta user ikkita machine_id'ga ega bo'lishi normal,
-- lekin BIR xil user BIR xil machine_id bilan ikkita App yaratmasin.
CREATE UNIQUE INDEX IF NOT EXISTS idx_apps_user_machine_unique
    ON apps(user_id, machine_id) WHERE machine_id IS NOT NULL;
