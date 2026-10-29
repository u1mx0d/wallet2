import { useState } from "react";
import { Pressable, View } from "react-native";
import { PieChart } from "react-native-gifted-charts";

import { Card, EmptyState, Skeleton, Text } from "@/components/ui";
import { formatBasisPoints, type CategorySlice } from "@/domain/aggregations";
import { formatTry } from "@/domain/money";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/ThemeProvider";

import { ChartFrame } from "./ChartFrame";

const CHART_HEIGHT = 220;
const MAX_RADIUS = 100;

export type ExpenseDonutCardProps = {
  slices: CategorySlice[] | null;
  totalExpenseMinor: number;
};

export function ExpenseDonutCard({
  slices,
  totalExpenseMinor,
}: ExpenseDonutCardProps) {
  const { colors } = useTheme();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const toggle = (key: string) =>
    setSelectedKey((current) => (current === key ? null : key));

  if (!slices) {
    return (
      <Card>
        <Text variant="subtitle">Harcama dağılımı</Text>
        <View className="items-center py-4">
          <Skeleton className="h-48 w-48 rounded-full" />
        </View>
      </Card>
    );
  }

  if (slices.length === 0) {
    return (
      <Card>
        <Text variant="subtitle">Harcama dağılımı</Text>
        <EmptyState title="Bu dönemde gider yok" className="py-4" />
      </Card>
    );
  }

  const selected = slices.find((slice) => slice.key === selectedKey);
  const data = slices.map((slice) => ({
    value: slice.amountMinor,
    color: slice.color,
    focused: slice.key === selectedKey,
  }));

  const summaryLabel = `Harcama dağılımı: ${slices
    .map((slice) => `${slice.name} ${formatBasisPoints(slice.basisPoints)}`)
    .join(", ")}`;

  return (
    <Card>
      <Text variant="subtitle">Harcama dağılımı</Text>

      <ChartFrame height={CHART_HEIGHT} accessibilityLabel={summaryLabel}>
        {(width) => {
          const radius = Math.min(MAX_RADIUS, Math.floor(width / 2) - 12);
          return (
            <View className="items-center">
              <PieChart
                data={data}
                donut
                radius={radius}
                innerRadius={Math.round(radius * 0.64)}
                innerCircleColor={colors.surface}
                onPress={(_item: unknown, index: number) => {
                  const slice = slices[index];
                  if (slice) toggle(slice.key);
                }}
                centerLabelComponent={() => (
                  <View
                    className="items-center px-2"
                    style={{ maxWidth: radius * 1.2 }}
                  >
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      {selected?.name ?? "Toplam gider"}
                    </Text>
                    <Text
                      numeric
                      className="font-semibold"
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {formatTry(selected?.amountMinor ?? totalExpenseMinor)}
                    </Text>
                    {selected ? (
                      <Text variant="caption" tone="muted">
                        {formatBasisPoints(selected.basisPoints)}
                      </Text>
                    ) : null}
                  </View>
                )}
              />
            </View>
          );
        }}
      </ChartFrame>

      <View>
        {slices.map((slice) => {
          const isSelected = slice.key === selectedKey;
          return (
            <Pressable
              key={slice.key}
              accessibilityRole="button"
              accessibilityLabel={`${slice.name}, ${formatBasisPoints(slice.basisPoints)}, ${formatTry(slice.amountMinor)}`}
              accessibilityState={{ selected: isSelected }}
              accessibilityHint="Grafikte vurgulamak için dokun"
              onPress={() => toggle(slice.key)}
              className={cn(
                "min-h-[48px] flex-row items-center gap-3 rounded-xl px-2",
                isSelected && "bg-surface-muted",
              )}
            >
              <CategoryIcon icon={slice.icon} color={slice.color} size="sm" />
              <Text
                className={cn("flex-1", isSelected && "font-semibold")}
                numberOfLines={1}
              >
                {slice.name}
              </Text>
              <Text variant="caption" tone="muted" numeric>
                {formatBasisPoints(slice.basisPoints)}
              </Text>
              <Text
                numeric
                className="w-28 text-right"
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatTry(slice.amountMinor)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
