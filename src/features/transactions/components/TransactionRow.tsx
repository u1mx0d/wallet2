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
  /** Uzun basma (ör. "Düzenle / Sil" menüsü). */
  onLongPress?: () => void;
  /** Verilirse ekran okuyucu eylemleri arasına "Sil" eklenir. */
  onDelete?: () => void;
  /** Gün başlığı altında tarih tekrar yazılmasın diye (History). */
  hideDate?: boolean;
};

export function TransactionRow({
  transaction,
  category,
  now,
  onPress,
  onLongPress,
  onDelete,
  hideDate = false,
}: TransactionRowProps) {
  const isIncome = transaction.type === "income";
  const signedAmount = isIncome
    ? transaction.amountMinor
    : -transaction.amountMinor;
  const amountText = formatTry(signedAmount, { sign: "always" });
  const dayLabel = formatDayLabel(new Date(transaction.date), now);
  const categoryName = category?.name ?? "Silinmiş kategori";

  const subtitle = hideDate
    ? (transaction.note ?? (isIncome ? "Gelir" : "Gider"))
    : transaction.note
      ? `${dayLabel} · ${transaction.note}`
      : dayLabel;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${categoryName}, ${isIncome ? "gelir" : "gider"} ${formatTry(transaction.amountMinor)}, ${dayLabel}${transaction.note ? `, not: ${transaction.note}` : ""}`}
      accessibilityHint={
        onDelete
          ? "Düzenlemek için dokun. Silmek için eylemler menüsünü kullan."
          : "Düzenlemek için dokun"
      }
      accessibilityActions={
        onDelete
          ? [{ name: "activate" }, { name: "delete", label: "Sil" }]
          : undefined
      }
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "activate") onPress();
        if (event.nativeEvent.actionName === "delete") onDelete?.();
      }}
      onPress={onPress}
      onLongPress={onLongPress}
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
          {subtitle}
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
