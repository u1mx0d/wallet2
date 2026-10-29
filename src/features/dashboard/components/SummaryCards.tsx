import { View } from "react-native";

import { Card, Skeleton, Text, type TextTone } from "@/components/ui";
import type { Summary } from "@/domain/aggregations";
import { formatTry } from "@/domain/money";

function AmountCard({
  label,
  amount,
  tone,
  sign,
  footer,
  className,
}: {
  label: string;
  amount: number;
  tone: TextTone;
  sign?: "auto" | "always";
  footer?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <Text
        variant="title"
        tone={tone}
        numeric
        numberOfLines={1}
        adjustsFontSizeToFit
        accessibilityRole="text"
      >
        {formatTry(amount, { sign })}
      </Text>
      {footer ? (
        <Text variant="caption" tone="muted">
          {footer}
        </Text>
      ) : null}
    </Card>
  );
}

export function SummaryCards({ summary }: { summary: Summary | null }) {
  if (!summary) {
    return (
      <View className="gap-3">
        <View className="flex-row gap-3">
          <Skeleton className="h-24 flex-1 rounded-2xl" />
          <Skeleton className="h-24 flex-1 rounded-2xl" />
        </View>
        <Skeleton className="h-24 w-full rounded-2xl" />
      </View>
    );
  }

  return (
    <View className="gap-3">
      <View className="flex-row gap-3">
        <AmountCard
          label="Gelir"
          amount={summary.incomeMinor}
          tone="income"
          className="flex-1"
        />
        <AmountCard
          label="Gider"
          amount={summary.expenseMinor}
          tone="expense"
          className="flex-1"
        />
      </View>
      <AmountCard
        label="Net"
        amount={summary.netMinor}
        tone={summary.netMinor >= 0 ? "income" : "expense"}
        sign="always"
        footer={`${summary.count} işlem`}
      />
    </View>
  );
}
