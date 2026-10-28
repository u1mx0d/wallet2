/**
 * Koşullu className birleştirici. false/null/undefined değerleri atar.
 *
 * NOT: Çakışan sınıfları (ör. "text-sm" ve "text-base") birleştirmez.
 * Bileşenlerde dışarıdan gelen className'i yalnızca yerleşim için
 * (margin, genişlik, hizalama) kullan; renk ve yazı boyutunu prop'larla değiştir.
 */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
