import { Pressable, View } from "react-native";

import { Text } from "@/components/ui";
import { formatDayLabel } from "@/domain/dates";
import { formatTry } from "@/domain/money";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import type { Category } from "@/features/categories/schemas";

import type { Transaction } from "../schemas";

export type TransactionRowProps = {
  transaction: Transaction;
  category: Category | undefined;
  now: Date;
  onPress: () => void;
};

export function TransactionRow({
  transaction,
  category,
  now,
  onPress,
}: TransactionRowProps) {
  const isIncome = transaction.type === "income";
  const signedAmount = isIncome
    ? transaction.amountMinor
    : -transaction.amountMinor;
  const amountText = formatTry(signedAmount, { sign: "always" });
  const dayLabel = formatDayLabel(new Date(transaction.date), now);
  const categoryName = category?.name ?? "Silinmiş kategori";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${categoryName}, ${isIncome ? "gelir" : "gider"} ${formatTry(transaction.amountMinor)}, ${dayLabel}${transaction.note ? `, not: ${transaction.note}` : ""}`}
      accessibilityHint="Düzenlemek için dokun"
      onPress={onPress}
      className="min-h-[56px] flex-row items-center gap-3 py-2"
    >
      <CategoryIcon
        icon={category?.icon ?? "dots"}
        color={category?.color ?? "#64748B"}
      />
      <View className="flex-1 gap-0.5">
        <Text numberOfLines={1} className="font-medium">
          {categoryName}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {transaction.note ? `${dayLabel} · ${transaction.note}` : dayLabel}
        </Text>
      </View>
      <Text
        numeric
        tone={isIncome ? "income" : "expense"}
        className="font-semibold"
      >
        {amountText}
      </Text>
    </Pressable>
  );
}
