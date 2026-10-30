/**
 * Fiyat servisinin saf mantığı: sağlayıcı yanıtını doğrulama, kuruşa çevirme,
 * önceki kapanışı türetme ve hangi satırların yazılacağını planlama.
 * Ağ veya veritabanı erişimi YOKTUR; birim testleri bu dosyayı test eder.
 */

export const BURKUT_SOURCE = "burkut";

const MAX_AMOUNT_MINOR = 999_999_999_999;
const SYMBOL_PATTERN = /^[A-Z0-9]{2,12}$/;
/** Günlük değişim bu sınırın dışındaysa (±%50) önceki kapanış türetilmez. */
const MAX_ABS_CHANGE_BASIS_POINTS = 5_000;
/** Fiyat × 100 ile en yakın tam sayı arasındaki izin verilen fark (kayan nokta gürültüsü). */
const MINOR_TOLERANCE = 0.0001;
const NAME_MAX_LENGTH = 100;

/**
 * Seans penceresi (UTC). Türkiye UTC+3, yaz saati yok.
 * 07:00-16:59 UTC = 10:00-19:59 TR. BIST pay piyasası ~10:00-18:10 TR.
 * Appwrite'ın saatlik aralığı her saatin kendi seçtiği dakikasında çalıştığı için
 * pencere, kapanıştan sonraki bir saati de kapsar.
 */
const MARKET_WINDOW_FIRST_UTC_HOUR = 7;
const MARKET_WINDOW_LAST_UTC_HOUR = 16;
/** Bu saatteki çalıştırma kapanıştan sonradır (19:xx TR): tam yenileme yapılır. */
const END_OF_DAY_UTC_HOUR = 16;

const BASIS_POINTS = BigInt(10_000);
const TWO = BigInt(2);

/**
 * Sağlayıcının ondalıklı TL fiyatını kuruşa çevirir. Kayan noktalı sayının sisteme
 * girdiği TEK yer burasıdır. 2'den fazla ondalık içeren, sıfır/negatif veya sınır
 * dışı fiyatlarda null döner (bu sembol yazılmaz).
 */
export function toMinor(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
    return null;
  const scaled = value * 100;
  const rounded = Math.round(scaled);
  if (Math.abs(scaled - rounded) > MINOR_TOLERANCE) return null;
  if (rounded < 1 || rounded > MAX_AMOUNT_MINOR) return null;
  return rounded;
}

/** Yüzde (ör. −1.66) → baz puan (−166). Geçersiz veya ±%50 dışındaysa null. */
export function toBasisPoints(percent) {
  if (typeof percent !== "number" || !Number.isFinite(percent)) return null;
  const basisPoints = Math.round(percent * 100);
  if (Math.abs(basisPoints) > MAX_ABS_CHANGE_BASIS_POINTS) return null;
  return basisPoints;
}

/**
 * Önceki kapanış = fiyat ÷ (1 + değişim). Değişim yüzdesi 2 ondalığa yuvarlanmış
 * geldiği için sonuç YAKLAŞIK ±1 kuruş sapabilir. BigInt ile hesaplanır.
 */
export function derivePrevCloseMinor(priceMinor, changeBasisPoints) {
  if (changeBasisPoints === null) return null;
  const denominator = BigInt(10_000 + changeBasisPoints);
  if (denominator <= BigInt(0)) return null;
  const numerator = BigInt(priceMinor) * BASIS_POINTS;
  const rounded = (numerator * TWO + denominator) / (TWO * denominator);
  const result = Number(rounded);
  if (result < 1 || result > MAX_AMOUNT_MINOR) return null;
  return result;
}

/**
 * Bürküt /stocks yanıtını doğrular ve iç biçime çevirir.
 * Geçersiz satırlar atlanır ve sayılır; yanıtın kendisi beklenmedik biçimdeyse hata fırlatır.
 */
export function parseBurkutResponse(json) {
  const items = json && Array.isArray(json.data) ? json.data : null;
  if (!items)
    throw new Error(
      "Sağlayıcı yanıtı beklenen biçimde değil (data dizisi yok).",
    );

  const quotes = [];
  let invalidCount = 0;

  for (const item of items) {
    const symbol =
      typeof item?.symbol === "string" ? item.symbol.trim().toUpperCase() : "";
    const priceMinor = toMinor(item?.price);
    const asOfMs =
      typeof item?.updatedAt === "string"
        ? Date.parse(item.updatedAt)
        : Number.NaN;

    if (
      !SYMBOL_PATTERN.test(symbol) ||
      priceMinor === null ||
      Number.isNaN(asOfMs)
    ) {
      invalidCount += 1;
      continue;
    }

    const name =
      typeof item.name === "string" && item.name.trim().length > 0
        ? item.name.trim().slice(0, NAME_MAX_LENGTH)
        : symbol;

    const providerStale =
      item.stale === true ||
      (typeof item.freshness === "string" && item.freshness !== "FRESH");

    quotes.push({
      symbol,
      name,
      priceMinor,
      prevCloseMinor: derivePrevCloseMinor(
        priceMinor,
        toBasisPoints(item.changePercent),
      ),
      asOf: new Date(asOfMs).toISOString(),
      stale: providerStale,
    });
  }

  return { quotes, invalidCount };
}

function isWeekdayUtc(now) {
  const day = now.getUTCDay();
  return day >= 1 && day <= 5;
}

/** Hafta içi 07:00-16:59 UTC (10:00-19:59 TR). Dışındaki zamanlanmış çalıştırmalar kota harcamaz. */
export function isWithinMarketWindow(now) {
  const hour = now.getUTCHours();
  return (
    isWeekdayUtc(now) &&
    hour >= MARKET_WINDOW_FIRST_UTC_HOUR &&
    hour <= MARKET_WINDOW_LAST_UTC_HOUR
  );
}

/** Günün son çalıştırması mı? Hafta içi 16:xx UTC = 19:xx TR (kapanıştan sonra). */
export function isEndOfDayRun(now) {
  return isWeekdayUtc(now) && now.getUTCHours() === END_OF_DAY_UTC_HOUR;
}

/** Var olan satır, yazılacak veriyle aynı mı? Zamanlar metin değil sayı olarak karşılaştırılır. */
export function rowMatches(existing, data) {
  return (
    existing.priceMinor === data.priceMinor &&
    (existing.prevCloseMinor ?? null) === data.prevCloseMinor &&
    Date.parse(existing.updatedAt) === Date.parse(data.updatedAt) &&
    Boolean(existing.stale) === data.stale &&
    (existing.name ?? null) === data.name &&
    existing.source === data.source
  );
}

/**
 * Hangi satırların yazılacağını planlar.
 * - fullRefresh: tüm semboller.
 * - Aksi halde: portföydeki semboller + tabloda hiç olmayan semboller.
 * - Değişmemiş satırlar atlanır.
 * Portföydeki ama sağlayıcı listesinde olmayan semboller missingHeld'de döner.
 */
export function planWrites({ quotes, existing, held, fullRefresh }) {
  const writes = [];
  const seen = new Set();

  for (const quote of quotes) {
    seen.add(quote.symbol);
    const current = existing.get(quote.symbol);
    const relevant = fullRefresh || held.has(quote.symbol) || !current;
    if (!relevant) continue;

    const data = {
      symbol: quote.symbol,
      name: quote.name,
      priceMinor: quote.priceMinor,
      prevCloseMinor: quote.prevCloseMinor,
      updatedAt: quote.asOf,
      source: BURKUT_SOURCE,
      stale: quote.stale,
    };
    if (current && rowMatches(current, data)) continue;
    writes.push({ symbol: quote.symbol, create: !current, data });
  }

  const missingHeld = [...held].filter((symbol) => !seen.has(symbol)).sort();
  return { writes, missingHeld };
}

/** "Eski veri" olarak işaretlenecek semboller: tabloda olan ve henüz işaretli olmayanlar. */
export function planStaleMarks({ existing, symbols }) {
  return [...symbols].filter((symbol) => {
    const row = existing.get(symbol);
    return row !== undefined && row.stale !== true;
  });
}
