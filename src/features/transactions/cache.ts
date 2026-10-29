import type { InfiniteData } from "@tanstack/react-query";

import type { TransactionType } from "@/features/categories/schemas";

import type { Transaction } from "./schemas";

export type TransactionFilters = {
  type?: TransactionType;
  categoryId?: string;
  /** Dahil, ISO tarih-saat. */
  from?: string;
  /** Dahil, ISO tarih-saat. */
  to?: string;
};

export type TransactionPage = {
  items: Transaction[];
  /** Sonraki sayfa için cursor (son satırın ID'si). null: sunucuda başka kayıt yok. */
  nextCursor: string | null;
};

export type TransactionPages = InfiniteData<TransactionPage, string | null>;

/**
 * Liste sırası: önce yeni tarihli işlemler. Aynı tarihte önce son eklenen.
 * Negatif sonuç: a, b'den ÖNCE gelir.
 */
export function compareTransactions(a: Transaction, b: Transaction): number {
  const byDate = Date.parse(b.date) - Date.parse(a.date);
  if (byDate !== 0) return byDate;
  const byCreated = Date.parse(b.createdAt) - Date.parse(a.createdAt);
  if (byCreated !== 0) return byCreated;
  if (a.id === b.id) return 0;
  return a.id < b.id ? 1 : -1;
}

export function matchesFilters(
  transaction: Transaction,
  filters: TransactionFilters,
): boolean {
  if (filters.type && transaction.type !== filters.type) return false;
  if (filters.categoryId && transaction.categoryId !== filters.categoryId)
    return false;
  const time = Date.parse(transaction.date);
  if (filters.from && time < Date.parse(filters.from)) return false;
  if (filters.to && time > Date.parse(filters.to)) return false;
  return true;
}

function replacePage(
  data: TransactionPages,
  index: number,
  page: TransactionPage,
): TransactionPages {
  return {
    ...data,
    pages: data.pages.map((current, i) => (i === index ? page : current)),
  };
}

type Position = { pageIndex: number; itemIndex: number };

function findPosition(data: TransactionPages, id: string): Position | null {
  for (let pageIndex = 0; pageIndex < data.pages.length; pageIndex += 1) {
    const itemIndex =
      data.pages[pageIndex]?.items.findIndex((item) => item.id === id) ?? -1;
    if (itemIndex !== -1) return { pageIndex, itemIndex };
  }
  return null;
}

/**
 * Güncellenen kayıt, mevcut konumunda önceki ve sonraki kayıtla sıralamayı bozmuyor mu?
 * (Sayfa sınırları dikkate alınmadan, tüm liste düz okunduğundaki komşulara bakılır.)
 */
function fitsInPlace(
  data: TransactionPages,
  position: Position,
  transaction: Transaction,
): boolean {
  const flat = data.pages.flatMap((page) => page.items);
  let flatIndex = position.itemIndex;
  for (let i = 0; i < position.pageIndex; i += 1)
    flatIndex += data.pages[i]?.items.length ?? 0;

  const previous = flat[flatIndex - 1];
  const next = flat[flatIndex + 1];
  return (
    (!previous || compareTransactions(previous, transaction) < 0) &&
    (!next || compareTransactions(transaction, next) < 0)
  );
}

/** ID'li işlemi tüm sayfalardan kaldırır. Bulunamazsa aynı nesneyi döner. */
export function removeTransaction(
  data: TransactionPages,
  id: string,
): TransactionPages {
  if (!findPosition(data, id)) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.filter((item) => item.id !== id),
    })),
  };
}

/**
 * İşlemi listeye ekler veya günceller.
 * - Filtreye uymuyorsa listeden çıkarır (varsa).
 * - Aynı ID zaten varsa ve sıralama bozulmuyorsa YERİNDE değiştirir: değişmeyen bir kayıt
 *   sayfa sınırında başka sayfaya kaymaz.
 * - Aksi halde çıkarıp sıralamaya uygun yere ekler.
 * - Yüklenmiş tüm kayıtlardan eskiyse ve sunucuda daha fazla sayfa varsa eklemez:
 *   kullanıcı aşağı kaydırınca sunucudan doğru yerinde gelecek.
 */
export function insertTransaction(
  data: TransactionPages,
  transaction: Transaction,
  filters: TransactionFilters,
): TransactionPages {
  if (!matchesFilters(transaction, filters))
    return removeTransaction(data, transaction.id);

  const existing = findPosition(data, transaction.id);
  if (existing && fitsInPlace(data, existing, transaction)) {
    const page = data.pages[existing.pageIndex];
    if (page) {
      return replacePage(data, existing.pageIndex, {
        ...page,
        items: page.items.map((item, index) =>
          index === existing.itemIndex ? transaction : item,
        ),
      });
    }
  }

  const base = removeTransaction(data, transaction.id);

  for (let pageIndex = 0; pageIndex < base.pages.length; pageIndex += 1) {
    const page = base.pages[pageIndex];
    if (!page) continue;
    const position = page.items.findIndex(
      (item) => compareTransactions(transaction, item) < 0,
    );
    if (position !== -1) {
      return replacePage(base, pageIndex, {
        ...page,
        items: [
          ...page.items.slice(0, position),
          transaction,
          ...page.items.slice(position),
        ],
      });
    }
  }

  const lastIndex = base.pages.length - 1;
  const lastPage = base.pages[lastIndex];
  if (!lastPage || lastPage.nextCursor !== null) return base;
  return replacePage(base, lastIndex, {
    ...lastPage,
    items: [...lastPage.items, transaction],
  });
}

/** Güncellenmiş işlemi yerinde değiştirir ya da yeni konumuna taşır; filtreye uymuyorsa çıkarır. */
export function replaceTransaction(
  data: TransactionPages,
  transaction: Transaction,
  filters: TransactionFilters,
): TransactionPages {
  return insertTransaction(data, transaction, filters);
}
