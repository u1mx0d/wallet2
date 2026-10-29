import { View } from "react-native";
import { LineChart } from "react-native-gifted-charts";

import { Card, EmptyState, Skeleton, Text } from "@/components/ui";
import {
    formatCompactTry,
    type TrendGranularity,
    type TrendPoint,
} from "@/domain/aggregations";
import { formatTry } from "@/domain/money";
import { useTheme } from "@/theme/ThemeProvider";

import { computeAxis } from "../chartAxis";

import { ChartFrame } from "./ChartFrame";

const CHART_HEIGHT = 160;
const Y_LABEL_WIDTH = 52;
const EDGE_SPACING = 8;
const MAX_X_LABELS = 6;

export type NetTrendCardProps = {
  trend: { granularity: TrendGranularity; points: TrendPoint[] } | null;
};

export function NetTrendCard({ trend }: NetTrendCardProps) {
  const { colors } = useTheme();

  if (!trend) {
    return (
      <Card>
        <Text variant="subtitle">Net değişim</Text>
        <Skeleton className="h-40 w-full rounded-xl" />
      </Card>
    );
  }

  const { points } = trend;
  const last = points[points.length - 1];

  if (!last) {
    return (
      <Card>
        <Text variant="subtitle">Net değişim</Text>
        <EmptyState title="Bu dönem henüz başlamadı" className="py-4" />
      </Card>
    );
  }

  const axis = computeAxis(points.map((point) => point.cumulativeMinor));
  const labelEvery = Math.ceil(points.length / MAX_X_LABELS);
  const data = points.map((point, index) => ({
    value: point.cumulativeMinor,
    label:
      index % labelEvery === 0 || index === points.length - 1
        ? point.label
        : "",
  }));

  const total = last.cumulativeMinor;
  const summaryLabel = `Dönem içindeki net değişim: ${formatTry(total, { sign: "always" })}. ${
    trend.granularity === "day" ? "Günlük" : "Aylık"
  } ${points.length} nokta.`;

  return (
    <Card>
      <View className="gap-1">
        <Text variant="subtitle">Net değişim</Text>
        <Text variant="title" numeric tone={total >= 0 ? "income" : "expense"}>
          {formatTry(total, { sign: "always" })}
        </Text>
      </View>

      <ChartFrame height={CHART_HEIGHT + 32} accessibilityLabel={summaryLabel}>
        {(width) => {
          const plotWidth = width - Y_LABEL_WIDTH - 8;
          const spacing =
            points.length > 1
              ? (plotWidth - 2 * EDGE_SPACING) / (points.length - 1)
              : 0;
          return (
            <LineChart
              data={data}
              width={plotWidth}
              height={CHART_HEIGHT}
              spacing={spacing}
              initialSpacing={EDGE_SPACING}
              endSpacing={EDGE_SPACING}
              color={colors.primary}
              thickness={2}
              hideDataPoints
              areaChart
              startFillColor={colors.primary}
              endFillColor={colors.primary}
              startOpacity={0.2}
              endOpacity={0.02}
              noOfSections={axis.noOfSections}
              maxValue={axis.maxValue}
              noOfSectionsBelowXAxis={axis.noOfSectionsBelowXAxis}
              mostNegativeValue={
                axis.noOfSectionsBelowXAxis > 0
                  ? axis.mostNegativeValue
                  : undefined
              }
              yAxisLabelWidth={Y_LABEL_WIDTH}
              formatYLabel={(label: string) =>
                formatCompactTry(Math.round(Number(label)))
              }
              yAxisTextStyle={{ color: colors.muted, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: colors.muted, fontSize: 11 }}
              rulesColor={colors.border}
              yAxisColor="transparent"
              xAxisColor={colors.border}
              disableScroll
            />
          );
        }}
      </ChartFrame>

      <Text variant="caption" tone="muted">
        Açılış bakiyesi bilinmediği için dönemin başından itibaren gelir ile
        gider arasındaki farkın birikimi gösterilir.
      </Text>
    </Card>
  );
}
