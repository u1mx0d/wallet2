/**
 * Dashboard'un dönem aralığı sorgularını (["transactions", userId, "range", from, to])
 * optimistic olarak güncelleyen saf fonksiyonlar. Böylece ekleme/düzenleme/silme
 * dashboard'daki toplamlara ve grafiklere de anında yansır.
 */
import { compareTransactions } from "@/features/transactions/cache";
import type { Transaction } from "@/features/transactions/schemas";

import type { RangeResult } from "./api";

/** Sorgu anahtarından aralık sınırlarını okur (4. ve 5. eleman). */
export function rangeBoundsFromKey(
  key: readonly unknown[],
): { from: string; to: string } | null {
  const from = key[3];
  const to = key[4];
  return typeof from === "string" && typeof to === "string"
    ? { from, to }
    : null;
}

export function isInRange(
  transaction: Transaction,
  from: string,
  to: string,
): boolean {
  const time = Date.parse(transaction.date);
  return time >= Date.parse(from) && time <= Date.parse(to);
}

/** ID'li işlemi kaldırır. Bulunamazsa aynı nesneyi döner. */
export function removeFromRange(data: RangeResult, id: string): RangeResult {
  if (!data.transactions.some((transaction) => transaction.id === id))
    return data;
  return {
    ...data,
    transactions: data.transactions.filter(
      (transaction) => transaction.id !== id,
    ),
  };
}

/**
 * İşlemi ekler veya günceller. Tarihi aralığın dışındaysa (ör. düzenlemede tarih değiştiyse)
 * aralıktan çıkarır.
 */
export function upsertInRange(
  data: RangeResult,
  transaction: Transaction,
  from: string,
  to: string,
): RangeResult {
  const base = removeFromRange(data, transaction.id);
  if (!isInRange(transaction, from, to)) return base;
  return {
    ...base,
    transactions: [...base.transactions, transaction].sort(compareTransactions),
  };
}
