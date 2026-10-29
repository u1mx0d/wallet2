import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { toQueryBounds, type DateRange } from "@/domain/periods";
import { useCurrentUserId } from "@/features/auth/useCurrentUserId";

import { fetchTransactionsInRange } from "./api";

export const dashboardKeys = {
  /** "transactions" altında: işlem eklenince/değişince/silinince otomatik yenilenir. */
  range: (userId: string, from: string, to: string) =>
    ["transactions", userId, "range", from, to] as const,
};

/**
 * Aralıktaki tüm işlemler. Dönem değiştirilince yeni veri gelene kadar önceki gösterilmeye
 * devam eder (ekran boşalıp titremez); isPlaceholderData ile bu durum anlaşılabilir.
 */
export function useTransactionsInRange(range: DateRange) {
  const userId = useCurrentUserId();
  const { from, to } = toQueryBounds(range);
  return useQuery({
    queryKey: dashboardKeys.range(userId, from, to),
    queryFn: () => fetchTransactionsInRange({ userId, from, to }),
    placeholderData: keepPreviousData,
  });
}
