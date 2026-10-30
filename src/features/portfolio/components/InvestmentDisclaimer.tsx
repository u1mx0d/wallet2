import { Text } from "@/components/ui";

/** Yatırım ekranlarının altında her zaman görünür. */
export function InvestmentDisclaimer() {
  return (
    <Text variant="caption" tone="muted" className="text-center">
      Bu uygulama yatırım tavsiyesi vermez. Fiyatlar bilgilendirme amaçlıdır ve
      gecikmelidir. Kâr/zarar hesapları vergi ve diğer kesintileri içermez.
      Fiyat kaynağı: Bürküt.
    </Text>
  );
}
