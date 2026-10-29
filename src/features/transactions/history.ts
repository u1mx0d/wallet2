/**
 * History ekranının saf yardımcıları: gün gruplaması ve filtre üretimi.
 * React veya Appwrite import etmez.
 */
import { formatDayLabel } from "@/domain/dates";
import { resolvePeriod, toQueryBounds } from "@/domain/periods";
import type { Category, TransactionType } from "@/features/categories/schemas";

import type { TransactionFilters } from "./cache";
import type { Transaction } from "./schemas";

/** Bu uzunluğun altındaki arama metinleri yok sayılır (her harfte sorgu atılmasın). */
export const MIN_SEARCH_LENGTH = 2;

export type HistoryRow =
  | { kind: "header"; key: string; label: string }
  | { kind: "item"; key: string; transaction: Transaction };

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/**
 * Tarihe göre (yeniden eskiye) SIRALI işlemleri gün başlıklarıyla düz bir listeye çevirir.
 * headerIndices, sabit (sticky) başlıkların listedeki konumlarıdır.
 */
export function groupTransactionsByDay(
  items: readonly Transaction[],
  now: Date,
): { rows: HistoryRow[]; headerIndices: number[] } {
  const rows: HistoryRow[] = [];
  const headerIndices: number[] = [];
  let currentDay: string | null = null;

  for (const transaction of items) {
    const date = new Date(transaction.date);
    const dayKey = localDayKey(date);
    if (dayKey !== currentDay) {
      currentDay = dayKey;
      headerIndices.push(rows.length);
      rows.push({
        kind: "header",
        key: `header-${dayKey}`,
        label: formatDayLabel(date, now),
      });
    }
    rows.push({ kind: "item", key: transaction.id, transaction });
  }

  return { rows, headerIndices };
}

/** Adında arama metni geçen kategoriler (Türkçe büyük/küçük harf kurallarıyla). */
export function matchingCategoryIds(
  categories: readonly Category[],
  search: string,
): string[] {
  const term = search.trim().toLocaleLowerCase("tr-TR");
  if (term.length === 0) return [];
  return categories
    .filter((category) =>
      category.name.toLocaleLowerCase("tr-TR").includes(term),
    )
    .map((category) => category.id);
}

export type HistoryFilterState = {
  type: TransactionType | "all";
  /** "" = tüm kategoriler. */
  categoryId: string;
  /** null = tüm tarihler. Günler DAHİL. */
  dateRange: { start: Date; end: Date } | null;
  /** Zaten debounce edilmiş arama metni. */
  search: string;
};

export function buildTransactionFilters(
  state: HistoryFilterState,
  categories: readonly Category[],
  now: Date,
): TransactionFilters {
  const filters: TransactionFilters = {};
  if (state.type !== "all") filters.type = state.type;
  if (state.categoryId) filters.categoryId = state.categoryId;
  if (state.dateRange) {
    const bounds = toQueryBounds(
      resolvePeriod({ kind: "custom", ...state.dateRange }, now),
    );
    filters.from = bounds.from;
    filters.to = bounds.to;
  }
  const search = state.search.trim();
  if (search.length >= MIN_SEARCH_LENGTH) {
    filters.search = search;
    const ids = matchingCategoryIds(categories, search);
    if (ids.length > 0) filters.searchCategoryIds = ids;
  }
  return filters;
}

/** Filtre düğmesinde gösterilen etkin filtre sayısı (arama hariç). */
export function countActiveFilters(state: HistoryFilterState): number {
  return (
    (state.type !== "all" ? 1 : 0) +
    (state.categoryId ? 1 : 0) +
    (state.dateRange ? 1 : 0)
  );
}
