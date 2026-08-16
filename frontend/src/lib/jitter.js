/**
 * Bazaviy interval atrofida tasodifiy siljish qo'shadi (masalan 5000ms ± 500ms).
 * Har bir klient sahifani ochganda BOSHQA interval oladi — shu bilan ko'p
 * foydalanuvchi bo'lganda ularning so'rovlari bitta soniyada to'planib
 * qolmaydi (thundering herd muammosi).
 */
export function jitteredInterval(baseMs, spreadMs = baseMs * 0.1) {
  const offset = (Math.random() * 2 - 1) * spreadMs;
  return Math.round(baseMs + offset);
}
