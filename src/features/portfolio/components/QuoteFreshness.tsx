import { View } from "react-native";

import { Text } from "@/components/ui";
import type { RealtimeStatus } from "@/lib/appwrite/realtimeStatus";

import { formatQuoteTime, oldestQuoteTime } from "../format";
import type { Quote } from "../schemas";

const LIVE_LABELS: Record<
  RealtimeStatus,
  { text: string; tone: "income" | "muted" | "warning" }
> = {
  connected: {
    text: "● Canlı: fiyat değişiklikleri anında yansır.",
    tone: "income",
  },
  connecting: { text: "Canlı bağlantı kuruluyor…", tone: "muted" },
  reconnecting: {
    text: "Canlı bağlantı koptu, yeniden kuruluyor…",
    tone: "warning",
  },
};

/** "Son güncelleme" ve gecikme notu; canlı bağlantı durumu; test verisi ve eski veri uyarıları. */
export function QuoteFreshness({
  quotes,
  now,
  liveStatus,
}: {
  quotes: readonly Quote[];
  now: Date;
  liveStatus?: RealtimeStatus;
}) {
  const oldest = oldestQuoteTime(quotes);
  if (!oldest) return null;

  const hasTestData = quotes.some((quote) => quote.source !== "burkut");
  const hasStale = quotes.some((quote) => quote.stale);
  const live = liveStatus ? LIVE_LABELS[liveStatus] : null;

  return (
    <View className="gap-1" accessibilityLiveRegion="polite">
      <Text variant="caption" tone="muted">
        Son güncelleme: {formatQuoteTime(oldest, now)} · Fiyatlar saatlik
        güncellenir; sağlayıcı verisi yaklaşık 15 dk gecikmelidir.
      </Text>
      {live ? (
        <Text variant="caption" tone={live.tone}>
          {live.text}
        </Text>
      ) : null}
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
