/**
 * Sağlayıcı şirket adlarını Türkçe karakter olmadan ve büyük harfle veriyor
 * ("TURK HAVA YOLLARI"). Arama metni aynı biçime çevrilir: "türk" → "TURK".
 */
const FOLD: Record<string, string> = {
  ç: "C",
  Ç: "C",
  ğ: "G",
  Ğ: "G",
  ı: "I",
  İ: "I",
  ö: "O",
  Ö: "O",
  ş: "S",
  Ş: "S",
  ü: "U",
  Ü: "U",
};

export function foldForSearch(text: string): string {
  return text
    .trim()
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (char) => FOLD[char] ?? char)
    .toUpperCase();
}
