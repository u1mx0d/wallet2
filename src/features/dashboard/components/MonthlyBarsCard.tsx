import { View } from "react-native";
import { BarChart } from "react-native-gifted-charts";

import { Card, EmptyState, Skeleton, Text } from "@/components/ui";
import { formatCompactTry, type MonthlyTotals } from "@/domain/aggregations";
import { formatTry } from "@/domain/money";
import { useTheme } from "@/theme/ThemeProvider";

import { computeAxis } from "../chartAxis";

import { ChartFrame } from "./ChartFrame";

const CHART_HEIGHT = 180;
const Y_LABEL_WIDTH = 52;
const PAIR_GAP = 4;
const EDGE_SPACING = 8;

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <View
        style={{
          width: 12,
          height: 12,
          borderRadius: 3,
          backgroundColor: color,
        }}
      />
      <Text variant="caption">{label}</Text>
    </View>
  );
}

export function MonthlyBarsCard({
  monthly,
}: {
  monthly: MonthlyTotals[] | null;
}) {
  const { colors } = useTheme();
  const title =
    monthly && monthly.length === 12
      ? "Aylık gelir ve gider (12 ay)"
      : "Aylık gelir ve gider (son 6 ay)";

  if (!monthly) {
    return (
      <Card>
        <Text variant="subtitle">{title}</Text>
        <Skeleton className="h-44 w-full rounded-xl" />
      </Card>
    );
  }

  const hasData = monthly.some(
    (month) => month.incomeMinor > 0 || month.expenseMinor > 0,
  );
  if (!hasData) {
    return (
      <Card>
        <Text variant="subtitle">{title}</Text>
        <EmptyState title="Bu aylarda işlem yok" className="py-4" />
      </Card>
    );
  }

  const axis = computeAxis(
    monthly.flatMap((month) => [month.incomeMinor, month.expenseMinor]),
  );
  const summaryLabel = `${title}: ${monthly
    .map(
      (month) =>
        `${month.label} gelir ${formatTry(month.incomeMinor)}, gider ${formatTry(month.expenseMinor)}`,
    )
    .join("; ")}`;

  return (
    <Card>
      <Text variant="subtitle">{title}</Text>

      <ChartFrame height={CHART_HEIGHT + 32} accessibilityLabel={summaryLabel}>
        {(width) => {
          const plotWidth = width - Y_LABEL_WIDTH - 8;
          const groups = monthly.length;
          const groupSpacing = groups > 6 ? 8 : 16;
          const available = plotWidth - 2 * EDGE_SPACING;
          const barWidth = Math.max(
            4,
            Math.min(
              18,
              Math.floor(
                (available - groups * (PAIR_GAP + groupSpacing)) / (2 * groups),
              ),
            ),
          );

          const data = monthly.flatMap((month) => [
            {
              value: month.incomeMinor,
              frontColor: colors.income,
              spacing: PAIR_GAP,
              label: month.label,
              labelWidth: 2 * barWidth + PAIR_GAP,
              labelTextStyle: {
                color: colors.muted,
                fontSize: 11,
                textAlign: "center" as const,
              },
            },
            { value: month.expenseMinor, frontColor: colors.expense },
          ]);

          return (
            <BarChart
              data={data}
              width={plotWidth}
              height={CHART_HEIGHT}
              barWidth={barWidth}
              spacing={groupSpacing}
              initialSpacing={EDGE_SPACING}
              endSpacing={EDGE_SPACING}
              barBorderRadius={3}
              noOfSections={axis.noOfSections}
              maxValue={axis.maxValue}
              yAxisLabelWidth={Y_LABEL_WIDTH}
              formatYLabel={(label: string) =>
                formatCompactTry(Math.round(Number(label)))
              }
              yAxisTextStyle={{ color: colors.muted, fontSize: 10 }}
              rulesColor={colors.border}
              yAxisColor="transparent"
              xAxisColor={colors.border}
              disableScroll
            />
          );
        }}
      </ChartFrame>

      <View className="flex-row gap-4">
        <LegendItem color={colors.income} label="Gelir" />
        <LegendItem color={colors.expense} label="Gider" />
      </View>
    </Card>
  );
}
