import { View } from "react-native";
import { PieChart } from "react-native-gifted-charts";

import { Card, Text } from "@/components/ui";
import { formatBasisPoints } from "@/domain/aggregations";
import { formatTry } from "@/domain/money";
import type { AllocationSlice } from "@/domain/portfolio";
import { ChartFrame } from "@/features/dashboard/components/ChartFrame";
import { useTheme } from "@/theme/ThemeProvider";

import { allocationColor } from "../format";

const CHART_HEIGHT = 200;

export function AllocationCard({
  allocation,
}: {
  allocation: readonly AllocationSlice[];
}) {
  const { colors } = useTheme();
  if (allocation.length === 0) return null;

  const summaryLabel = `Portföy dağılımı: ${allocation
    .map((slice) => `${slice.symbol} ${formatBasisPoints(slice.basisPoints)}`)
    .join(", ")}`;

  return (
    <Card>
      <Text variant="subtitle">Dağılım</Text>

      <ChartFrame height={CHART_HEIGHT} accessibilityLabel={summaryLabel}>
        {(width) => {
          const radius = Math.min(90, Math.floor(width / 2) - 12);
          return (
            <View className="items-center">
              <PieChart
                data={allocation.map((slice, index) => ({
                  value: slice.marketValueMinor,
                  color: allocationColor(index),
                }))}
                donut
                radius={radius}
                innerRadius={Math.round(radius * 0.62)}
                innerCircleColor={colors.surface}
              />
            </View>
          );
        }}
      </ChartFrame>

      <View className="gap-2">
        {allocation.map((slice, index) => (
          <View key={slice.symbol} className="flex-row items-center gap-3">
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: allocationColor(index),
              }}
            />
            <Text className="flex-1 font-medium">{slice.symbol}</Text>
            <Text variant="caption" tone="muted" numeric>
              {formatBasisPoints(slice.basisPoints)}
            </Text>
            <Text
              numeric
              className="w-32 text-right"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatTry(slice.marketValueMinor)}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
