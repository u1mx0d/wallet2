/**
 * Para yardımcıları (TRY).
 *
 * KURALLAR
 * - Tüm tutarlar KURUŞ cinsinden tam sayıdır (minor unit): ₺1.234,56 → 123456.
 * - Hiçbir yerde float ile para hesabı yapılmaz; metin tam sayı + kuruş parçalarına ayrılır.
 * - Biçimlendirme Intl yerine elle yapılır: Hermes, Android sürümleri ve Node.js arasında
 *   aynı çıktıyı garanti etmek için.
 *
 * Bu dosya saf TypeScript'tir: React, React Native, Appwrite veya "@/" alias'ı import etmez.
 */

/** En büyük tutar (kuruş) ≈ 10 milyar TL. Appwrite kolon sınırıyla aynı (ADIM 2). */
export const MAX_AMOUNT_MINOR = 999_999_999_999;

/** Negatif tutarlar için tipografik eksi işareti (U+2212); tireden daha okunaklı. */
export const MINUS_SIGN = "\u2212";

const MINOR_PER_LIRA = 100;
const MAX_INTEGER_DIGITS = 13;

export type MoneyParseError =
  | "empty"
  | "invalid"
  | "negative"
  | "too_many_decimals"
  | "too_large";

export type MoneyParseResult =
  | { ok: true; value: number }
  | { ok: false; error: MoneyParseError };

export const MONEY_PARSE_ERROR_MESSAGES: Record<MoneyParseError, string> = {
  empty: "Tutarı yaz.",
  invalid: "Geçerli bir tutar yaz (ör. 1.234,56).",
  negative: "Tutar negatif olamaz.",
  too_many_decimals: "Kuruş kısmı en fazla 2 haneli olabilir.",
  too_large: "Tutar çok büyük.",
};

/** 1-3 hane, ardından en az bir kez ".ddd" grubu: 1.234 / 12.345.678 */
const GROUPED_INTEGER = /^\d{1,3}(\.\d{3})+$/;
const PLAIN_INTEGER = /^\d+$/;

function fail(error: MoneyParseError): MoneyParseResult {
  return { ok: false, error };
}

function countChar(text: string, char: string): number {
  let count = 0;
  for (const current of text) if (current === char) count += 1;
  return count;
}

/**
 * Kullanıcının yazdığı TRY tutarını kuruşa çevirir.
 *
 * - Virgül varsa: virgül ondalık ayırıcı, noktalar binlik ayırıcıdır ("1.234,56").
 * - Virgül yoksa: noktadan sonra TAM 3 hanelik gruplar → binlik ("1.234", "1.234.567");
 *   tek nokta ve ardından 1-2 hane → ondalık ("12.5", "1234.56").
 * - "₺", "TL" ve boşluklar yok sayılır. Negatif değer kabul edilmez.
 * - 0 geçerli bir sonuçtur; "en az 1 kuruş" kuralı form doğrulamasında uygulanır.
 */
export function parseTryInput(input: string): MoneyParseResult {
  let text = input
    .replace(/[\s\u00A0]/g, "")
    .replace(/₺/g, "")
    .replace(/^tl|tl$/gi, "");

  if (text === "") return fail("empty");
  if (text.startsWith("-") || text.startsWith(MINUS_SIGN))
    return fail("negative");
  if (text.startsWith("+")) text = text.slice(1);
  if (!/^[\d.,]+$/.test(text)) return fail("invalid");

  const commaCount = countChar(text, ",");
  if (commaCount > 1) return fail("invalid");

  let integerRaw: string;
  let fractionRaw: string;

  if (commaCount === 1) {
    const commaIndex = text.indexOf(",");
    integerRaw = text.slice(0, commaIndex);
    fractionRaw = text.slice(commaIndex + 1);
    if (fractionRaw.includes(".")) return fail("invalid");
    if (
      integerRaw !== "" &&
      !PLAIN_INTEGER.test(integerRaw) &&
      !GROUPED_INTEGER.test(integerRaw)
    ) {
      return fail("invalid");
    }
  } else {
    const dotCount = countChar(text, ".");
    if (dotCount === 0 || GROUPED_INTEGER.test(text)) {
      integerRaw = text;
      fractionRaw = "";
    } else if (dotCount === 1) {
      const dotIndex = text.indexOf(".");
      integerRaw = text.slice(0, dotIndex);
      fractionRaw = text.slice(dotIndex + 1);
    } else {
      return fail("invalid");
    }
  }

  if (integerRaw === "" && fractionRaw === "") return fail("invalid");
  if (fractionRaw.length > 2) return fail("too_many_decimals");

  const integerDigits =
    integerRaw.replace(/\./g, "").replace(/^0+(?=\d)/, "") || "0";
  if (integerDigits.length > MAX_INTEGER_DIGITS) return fail("too_large");

  const value =
    Number(integerDigits) * MINOR_PER_LIRA + Number(fractionRaw.padEnd(2, "0"));
  if (value > MAX_AMOUNT_MINOR) return fail("too_large");

  return { ok: true, value };
}

/** Değerin güvenli bir tam sayı (kuruş) olduğunu doğrular; değilse hata fırlatır. */
export function assertMinor(value: number, label = "Tutar"): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(
      `${label} güvenli bir tam sayı (kuruş) olmalı: ${String(value)}`,
    );
  }
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Mutlak değeri tam lira ve kuruş olarak böler; yalnızca tam sayı aritmetiği kullanır. */
function splitMinor(absoluteMinor: number): { lira: number; kurus: number } {
  const kurus = absoluteMinor % MINOR_PER_LIRA;
  const lira = (absoluteMinor - kurus) / MINOR_PER_LIRA;
  return { lira, kurus };
}

export type FormatTryOptions = {
  /** "auto": yalnızca negatiflerde işaret. "always": pozitiflerde de "+" (sıfırda işaret yok). */
  sign?: "auto" | "always";
};

/** Kuruşu ekranda gösterilecek metne çevirir: 123456 → "₺1.234,56", -500 → "−₺5,00". */
export function formatTry(
  minor: number,
  options: FormatTryOptions = {},
): string {
  assertMinor(minor);
  const { lira, kurus } = splitMinor(Math.abs(minor));
  const body = `₺${groupThousands(String(lira))},${String(kurus).padStart(2, "0")}`;

  if (minor < 0) return `${MINUS_SIGN}${body}`;
  if (minor > 0 && options.sign === "always") return `+${body}`;
  return body;
}

/**
 * Düzenleme formunda alana yazılacak metin: sembolsüz, kuruş sıfırsa kuruşsuz.
 * 123456 → "1.234,56", 100000 → "1.000", 50 → "0,50". parseTryInput ile geri çevrilebilir.
 */
export function formatMinorForInput(minor: number): string {
  assertMinor(minor);
  if (minor < 0) throw new RangeError("Form alanı için tutar negatif olamaz.");
  const { lira, kurus } = splitMinor(minor);
  const grouped = groupThousands(String(lira));
  return kurus === 0 ? grouped : `${grouped},${String(kurus).padStart(2, "0")}`;
}

/** Kuruş değerlerini toplar; her değeri ve ara toplamı güvenli tam sayı sınırına karşı denetler. */
export function sumMinor(values: readonly number[]): number {
  let total = 0;
  for (const value of values) {
    assertMinor(value);
    total += value;
    if (!Number.isSafeInteger(total)) {
      throw new RangeError("Toplam, güvenli tam sayı sınırını aştı.");
    }
  }
  return total;
}
