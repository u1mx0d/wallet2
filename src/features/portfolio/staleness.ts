/**
 * Fiyatların yaşından "eski veri" tespiti. Sunucudan hiçbir işaret gelmese bile
 * (ör. fiyat servisi veritabanına hiç ulaşamadıysa) uygulama eski fiyatı fark eder.
 *
 * Seans: BIST pay piyasası ~10:00-18:10 TR = 07:00-15:10 UTC (Türkiye UTC+3, yaz saati yok).
 * Fiyat servisi saatte bir çalışır, sağlayıcı ~15 dk gecikmelidir → normalde en fazla ~75 dk eski.
 * Hesap UTC ile yapılır; telefonun saat diliminden bağımsızdır.
 */
const MARKET_OPEN_UTC_MINUTES = 7 * 60;
const MARKET_CLOSE_UTC_MINUTES = 15 * 60 + 10;
/** Bu yaştan eski fiyat seans içinde "beklenenden eski" sayılır. */
export const MAX_EXPECTED_QUOTE_AGE_MS = 90 * 60 * 1000;
/** Açılıştan sonraki ilk 90 dk önceki günün kapanışı normaldir; kapanıştan 60 dk sonra kontrol durur. */
const GRACE_AFTER_OPEN_MINUTES = 90;
const CHECK_AFTER_CLOSE_MINUTES = 60;

export function isQuoteOutdated(updatedAtIso: string, now: Date): boolean {
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return false;

  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  if (minutes < MARKET_OPEN_UTC_MINUTES + GRACE_AFTER_OPEN_MINUTES)
    return false;
  if (minutes > MARKET_CLOSE_UTC_MINUTES + CHECK_AFTER_CLOSE_MINUTES)
    return false;

  const updatedAt = Date.parse(updatedAtIso);
  if (Number.isNaN(updatedAt)) return true;
  return now.getTime() - updatedAt > MAX_EXPECTED_QUOTE_AGE_MS;
}
