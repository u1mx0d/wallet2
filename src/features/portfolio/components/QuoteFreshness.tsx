import { View } from "react-native";

import { Text } from "@/components/ui";

import { formatQuoteTime, oldestQuoteTime } from "../format";
import type { Quote } from "../schemas";

/** "Son güncelleme" ve gecikme notu; test verisi ve eski veri uyarıları. */
export function QuoteFreshness({
  quotes,
  now,
}: {
  quotes: readonly Quote[];
  now: Date;
}) {
  const oldest = oldestQuoteTime(quotes);
  if (!oldest) return null;

  const hasTestData = quotes.some((quote) => quote.source !== "burkut");
  const hasStale = quotes.some((quote) => quote.stale);

  return (
    <View className="gap-1" accessibilityLiveRegion="polite">
      <Text variant="caption" tone="muted">
        Son güncelleme: {formatQuoteTime(oldest, now)} · Fiyatlar saatlik
        güncellenir; sağlayıcı verisi yaklaşık 15 dk gecikmelidir.
      </Text>
      {hasStale ? (
        <Text variant="caption" tone="warning">
          Bazı fiyatlar güncellenemedi; son bilinen fiyat gösteriliyor.
        </Text>
      ) : null}
      {hasTestData ? (
        <Text variant="caption" tone="warning">
          Bazı fiyatlar test verisidir; gerçek piyasa fiyatı değildir.
        </Text>
      ) : null}
    </View>
  );
}
