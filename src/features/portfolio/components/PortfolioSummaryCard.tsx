import { View } from "react-native";

import { Card, Text } from "@/components/ui";
import { formatTry } from "@/domain/money";
import {
  formatSignedBasisPoints,
  type PortfolioSummary,
} from "@/domain/portfolio";

import { ValueRow } from "./ValueRow";

function pnlTone(value: number) {
  return value >= 0 ? ("income" as const) : ("expense" as const);
}

export function PortfolioSummaryCard({
  summary,
}: {
  summary: PortfolioSummary;
}) {
  return (
    <Card>
      <Text variant="label" tone="muted">
        Portföy değeri
      </Text>
      <Text variant="display" numeric numberOfLines={1} adjustsFontSizeToFit>
        {formatTry(summary.marketValueMinor)}
      </Text>

      <View className="gap-3">
        <ValueRow
          label="Gerçekleşmemiş kâr/zarar"
          value={formatTry(summary.unrealizedPnlMinor, { sign: "always" })}
          detail={
            summary.unrealizedPnlBasisPoints === null
              ? undefined
              : formatSignedBasisPoints(summary.unrealizedPnlBasisPoints)
          }
          tone={pnlTone(summary.unrealizedPnlMinor)}
          emphasize
        />
        <ValueRow
          label="Gerçekleşmiş kâr/zarar"
          value={formatTry(summary.realizedPnlMinor, { sign: "always" })}
          tone={pnlTone(summary.realizedPnlMinor)}
        />
        <ValueRow
          label="Günlük değişim (yaklaşık)"
          value={formatTry(summary.dailyChangeMinor, { sign: "always" })}
          tone={pnlTone(summary.dailyChangeMinor)}
        />
        <ValueRow label="Maliyet" value={formatTry(summary.costBasisMinor)} />
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
