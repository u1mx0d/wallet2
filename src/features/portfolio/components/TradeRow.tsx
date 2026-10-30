import { Pressable, View } from "react-native";

import { Text } from "@/components/ui";
import { formatDayLabel } from "@/domain/dates";
import { formatTry } from "@/domain/money";

import { formatLots, tradeCashMinor } from "../format";
import type { Trade } from "../schemas";

export function TradeRow({
  trade,
  now,
  onPress,
}: {
  trade: Trade;
  now: Date;
  onPress: () => void;
}) {
  const isBuy = trade.side === "buy";
  const cash = tradeCashMinor(trade);
  const dayLabel = formatDayLabel(new Date(trade.date), now);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${isBuy ? "Alım" : "Satım"}, ${formatLots(trade.lots)} lot, ${formatTry(trade.priceMinor)} fiyattan, ${dayLabel}`}
      accessibilityHint="Düzenlemek için dokun"
      onPress={onPress}
      className="min-h-[56px] flex-row items-center gap-3 py-2"
    >
      <View className="flex-1 gap-0.5">
        <Text className="font-medium" tone={isBuy ? "income" : "expense"}>
          {isBuy ? "Alım" : "Satım"} · {formatLots(trade.lots)} lot
        </Text>
        <Text variant="caption" tone="muted">
          {dayLabel} · {formatTry(trade.priceMinor)}
          {trade.feeMinor > 0 ? ` · komisyon ${formatTry(trade.feeMinor)}` : ""}
        </Text>
      </View>
      {cash !== null ? (
        <Text numeric className="font-semibold">
          {formatTry(cash)}
        </Text>
      ) : null}
    </Pressable>
  );
}
