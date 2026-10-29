import { useMemo } from "react";

import {
    cumulativeNetTrend,
    expenseBreakdown,
    monthlyTotals,
    monthsEnding,
    monthsToRange,
    summarize,
} from "@/domain/aggregations";
import { resolvePeriod, type Period } from "@/domain/periods";
import { useCategories } from "@/features/categories/hooks";

import { useTransactionsInRange } from "./hooks";

/**
 * Seçilen dönemin tüm dashboard verisi.
 * - Özet, kategori dağılımı ve trend: seçili dönem.
 * - Aylık çubuklar: seçili dönemin son ayıyla biten son 6 ay ("Yıl" seçiliyse 12 ay).
 */
export function useDashboard(period: Period, now: Date) {
  const range = useMemo(() => resolvePeriod(period, now), [period, now]);

  const months = useMemo(
    () =>
      monthsEnding(
        new Date(range.end.getTime() - 1),
        period.kind === "year" ? 12 : 6,
      ),
    [range, period.kind],
  );
  const monthsRange = useMemo(() => monthsToRange(months), [months]);

  const periodQuery = useTransactionsInRange(range);
  const monthsQuery = useTransactionsInRange(monthsRange);
  const categories = useCategories();

  const periodTransactions = periodQuery.data?.transactions;
  const monthsTransactions = monthsQuery.data?.transactions;

  const summary = useMemo(
    () => (periodTransactions ? summarize(periodTransactions) : null),
    [periodTransactions],
  );

  const breakdown = useMemo(
    () =>
      periodTransactions && categories.data
        ? expenseBreakdown(periodTransactions, categories.data)
        : null,
    [periodTransactions, categories.data],
  );

  const trend = useMemo(
    () =>
      periodTransactions
        ? cumulativeNetTrend(periodTransactions, range, now)
        : null,
    [periodTransactions, range, now],
  );

  const monthly = useMemo(
    () =>
      monthsTransactions ? monthlyTotals(monthsTransactions, months) : null,
    [monthsTransactions, months],
  );

  return {
    range,
    periodQuery,
    monthsQuery,
    summary,
    breakdown,
    trend,
    monthly,
    /** Önceki dönemin verisi gösteriliyor, yenisi yükleniyor. */
    isRefreshing:
      periodQuery.isPlaceholderData || monthsQuery.isPlaceholderData,
    truncated: Boolean(
      periodQuery.data?.truncated || monthsQuery.data?.truncated,
    ),
  };
}
