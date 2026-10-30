import { View } from "react-native";

import { Card, Text } from "@/components/ui";
import { formatTry } from "@/domain/money";
import {
    formatSignedBasisPoints,
    type PortfolioSummary,
} from "@/domain/portfolio";

function pnlTone(value: number) {
  return value >= 0 ? ("income" as const) : ("expense" as const);
}

export function PortfolioSummaryCard({
  summary,
}: {
  summary: PortfolioSummary;
}) {
  const unrealizedPercent =
    summary.unrealizedPnlBasisPoints === null
      ? ""
      : ` (${formatSignedBasisPoints(summary.unrealizedPnlBasisPoints)})`;

  return (
    <Card>
      <Text variant="label" tone="muted">
        Portföy değeri
      </Text>
      <Text variant="display" numeric numberOfLines={1} adjustsFontSizeToFit>
        {formatTry(summary.marketValueMinor)}
      </Text>

      <View className="gap-2">
        <View className="flex-row justify-between gap-3">
          <Text tone="muted">Gerçekleşmemiş kâr/zarar</Text>
          <Text
            numeric
            tone={pnlTone(summary.unrealizedPnlMinor)}
            className="font-semibold"
          >
            {formatTry(summary.unrealizedPnlMinor, { sign: "always" })}
            {unrealizedPercent}
          </Text>
        </View>
        <View className="flex-row justify-between gap-3">
          <Text tone="muted">Gerçekleşmiş kâr/zarar</Text>
          <Text numeric tone={pnlTone(summary.realizedPnlMinor)}>
            {formatTry(summary.realizedPnlMinor, { sign: "always" })}
          </Text>
        </View>
        <View className="flex-row justify-between gap-3">
          <Text tone="muted">Günlük değişim (yaklaşık)</Text>
          <Text numeric tone={pnlTone(summary.dailyChangeMinor)}>
            {formatTry(summary.dailyChangeMinor, { sign: "always" })}
          </Text>
        </View>
        <View className="flex-row justify-between gap-3">
          <Text tone="muted">Maliyet</Text>
          <Text numeric>{formatTry(summary.costBasisMinor)}</Text>
        </View>
      </View>

      {summary.missingPriceSymbols.length > 0 ? (
        <Text variant="caption" tone="warning">
          Fiyatı bulunamayan hisseler toplamlara dahil değil:{" "}
          {summary.missingPriceSymbols.join(", ")}
        </Text>
      ) : null}
    </Card>
  );
}
