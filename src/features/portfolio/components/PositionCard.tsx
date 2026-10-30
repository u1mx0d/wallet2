import { Pressable, View } from "react-native";

import { Text } from "@/components/ui";
import { formatTry } from "@/domain/money";
import {
  formatSignedBasisPoints,
  type PositionValuation,
} from "@/domain/portfolio";

import { formatLots } from "../format";
import type { Quote } from "../schemas";

export function PositionCard({
  position,
  quote,
  onPress,
}: {
  position: PositionValuation;
  quote: Quote | undefined;
  onPress: () => void;
}) {
  const pnl = position.unrealizedPnlMinor;
  const pnlTone = pnl === null ? "muted" : pnl >= 0 ? "income" : "expense";
  const pnlAmount = pnl === null ? null : formatTry(pnl, { sign: "always" });
  const pnlPercent =
    position.unrealizedPnlBasisPoints === null
      ? null
      : formatSignedBasisPoints(position.unrealizedPnlBasisPoints);

  const accessibilityLabel = [
    `${position.symbol}${quote ? `, ${quote.name}` : ""}`,
    `${formatLots(position.lots)} lot`,
    position.marketValueMinor === null
      ? "fiyat yok"
      : `değer ${formatTry(position.marketValueMinor)}`,
    pnlAmount
      ? `kâr zarar ${pnlAmount}${pnlPercent ? `, ${pnlPercent}` : ""}`
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Ayrıntılar için dokun"
      onPress={onPress}
      className="gap-2 rounded-2xl border border-border bg-surface p-4"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="font-semibold">{position.symbol}</Text>
          {quote ? (
            <Text variant="caption" tone="muted" numberOfLines={2}>
              {quote.name}
            </Text>
          ) : null}
        </View>
        <View className="max-w-[55%] shrink items-end">
          <Text numeric className="text-right font-semibold">
            {position.marketValueMinor === null
              ? "Fiyat yok"
              : formatTry(position.marketValueMinor)}
          </Text>
          {pnlAmount ? (
            <Text
              variant="caption"
              numeric
              tone={pnlTone}
              className="text-right"
            >
              {pnlAmount}
            </Text>
          ) : null}
          {pnlPercent ? (
            <Text
              variant="caption"
              numeric
              tone={pnlTone}
              className="text-right"
            >
              {pnlPercent}
            </Text>
          ) : null}
        </View>
      </View>
      <View className="flex-row flex-wrap justify-between gap-x-3 gap-y-1">
        <Text variant="caption" tone="muted" numeric>
          {formatLots(position.lots)} lot · ort.{" "}
          {formatTry(position.averageCostMinor)}
        </Text>
        {position.priceMinor !== null ? (
          <Text variant="caption" tone="muted" numeric>
            Fiyat {formatTry(position.priceMinor)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
