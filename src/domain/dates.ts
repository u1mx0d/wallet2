/**
 * Tarih yardımcıları. Tüm "gün" hesapları cihazın YEREL saat dilimine göredir.
 * Bu dosya saf TypeScript'tir: React, React Native veya Appwrite import etmez.
 */

export const TR_MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
] as const;

/** Günü geçmiş tarih saatinin 12:00'sine çekilir: saat dilimi farkında gün kaymasın. */
const PAST_DAY_HOUR = 12;

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addLocalDays(date: Date, days: number): Date {
  const result = startOfLocalDay(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** "29 Ekim 2026" */
export function formatFullDate(date: Date): string {
  return `${date.getDate()} ${TR_MONTHS[date.getMonth()] ?? ""} ${date.getFullYear()}`;
}

/** "Bugün", "Dün", aynı yıl içinde "5 Ocak", farklı yılda "31 Aralık 2025". */
export function formatDayLabel(date: Date, now: Date): string {
  if (isSameLocalDay(date, now)) return "Bugün";
  if (isSameLocalDay(date, addLocalDays(now, -1))) return "Dün";
  const dayMonth = `${date.getDate()} ${TR_MONTHS[date.getMonth()] ?? ""}`;
  return date.getFullYear() === now.getFullYear()
    ? dayMonth
    : `${dayMonth} ${date.getFullYear()}`;
}

/**
 * Kullanıcının seçtiği güne kaydedilecek saati belirler.
 * - Düzenlemede gün değişmediyse orijinal saat korunur.
 * - Seçilen gün bugünse şimdiki saat kullanılır.
 * - Geçmiş bir günse o günün 12:00'si kullanılır.
 */
export function combineDayWithTime(
  day: Date,
  now: Date,
  previous?: Date,
): Date {
  if (previous && isSameLocalDay(previous, day))
    return new Date(previous.getTime());
  if (isSameLocalDay(day, now)) return new Date(now.getTime());
  const result = startOfLocalDay(day);
  result.setHours(PAST_DAY_HOUR, 0, 0, 0);
  return result;
}
