import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import { useCurrentUserId } from "@/features/auth/useCurrentUserId";

import {
  createTransaction,
  deleteTransaction,
  fetchTransaction,
  fetchTransactionsPage,
  updateTransaction,
} from "./api";
import {
  insertTransaction,
  removeTransaction,
  replaceTransaction,
  type TransactionFilters,
  type TransactionPages,
} from "./cache";
import type { Transaction, TransactionInput } from "./schemas";

export const transactionKeys = {
  /** Kullanıcının tüm işlem sorguları (listeler, tekil kayıtlar, dashboard aralıkları). */
  all: (userId: string) => ["transactions", userId] as const,
  lists: (userId: string) => ["transactions", userId, "list"] as const,
  list: (userId: string, filters: TransactionFilters) =>
    ["transactions", userId, "list", filters] as const,
  detail: (userId: string, id: string) =>
    ["transactions", userId, "detail", id] as const,
};

/** Bağlantı şeridi (SyncStatusBanner) "transactions" ile başlayan mutation anahtarlarını izler. */
const mutationKeys = {
  create: ["transactions", "create"] as const,
  update: ["transactions", "update"] as const,
  delete: ["transactions", "delete"] as const,
};

export function useTransactions(filters: TransactionFilters = {}) {
  const userId = useCurrentUserId();
  return useInfiniteQuery({
    queryKey: transactionKeys.list(userId, filters),
    queryFn: ({ pageParam }) =>
      fetchTransactionsPage({ userId, filters, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

function findInLists(
  queryClient: QueryClient,
  userId: string,
  id: string,
): Transaction | undefined {
  const entries = queryClient.getQueriesData<TransactionPages>({
    queryKey: transactionKeys.lists(userId),
  });
  for (const [, data] of entries) {
    const found = data?.pages
      .flatMap((page) => page.items)
      .find((item) => item.id === id);
    if (found) return found;
  }
  return undefined;
}

/** Tek işlem. Listelerde yüklüyse oradan anında gelir, yoksa sunucudan okunur. null: bulunamadı. */
export function useTransaction(id: string) {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: transactionKeys.detail(userId, id),
    queryFn: () => fetchTransaction(id),
    initialData: () => findInLists(queryClient, userId, id),
  });
}

type Snapshot = Array<[QueryKey, TransactionPages | undefined]>;

/**
 * Önbellekteki TÜM işlem listelerini (her filtre kombinasyonu ayrı bir liste) günceller.
 * Filtre, sorgu anahtarının 4. elemanından okunur. Geri almak için önceki halleri döner.
 */
async function updateAllLists(
  queryClient: QueryClient,
  userId: string,
  updater: (
    data: TransactionPages,
    filters: TransactionFilters,
  ) => TransactionPages,
): Promise<Snapshot> {
  await queryClient.cancelQueries({ queryKey: transactionKeys.all(userId) });
  const entries = queryClient.getQueriesData<TransactionPages>({
    queryKey: transactionKeys.lists(userId),
  });
  for (const [key, data] of entries) {
    if (!data) continue;
    const filters = (key[3] ?? {}) as TransactionFilters;
    queryClient.setQueryData(key, updater(data, filters));
  }
  return entries;
}

function restore(
  queryClient: QueryClient,
  snapshot: Snapshot | undefined,
): void {
  if (!snapshot) return;
  for (const [key, data] of snapshot) queryClient.setQueryData(key, data);
}

/** Geri alınabilir silme için: işlemi sunucuya dokunmadan tüm listelerden kaldırır. */
export function removeFromTransactionLists(
  queryClient: QueryClient,
  userId: string,
  id: string,
): Promise<Snapshot> {
  return updateAllLists(queryClient, userId, (data) =>
    removeTransaction(data, id),
  );
}

/** Geri alma: işlemi tüm listelerde (filtreye uyuyorsa) doğru yerine geri koyar. */
export function restoreToTransactionLists(
  queryClient: QueryClient,
  userId: string,
  transaction: Transaction,
): Promise<Snapshot> {
  return updateAllLists(queryClient, userId, (data, filters) =>
    insertTransaction(data, transaction, filters),
  );
}

/** Çağıran, ID'yi newTransactionId() ile üretir (optimistic kayıt ve tekrar deneme güvenliği için). */
export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();

  return useMutation({
    mutationKey: mutationKeys.create,
    mutationFn: ({ id, input }: { id: string; input: TransactionInput }) =>
      createTransaction({ userId, id, input }),
    onMutate: ({ id, input }) => {
      const optimistic: Transaction = {
        id,
        ...input,
        createdAt: new Date().toISOString(),
      };
      return updateAllLists(queryClient, userId, (data, filters) =>
        insertTransaction(data, optimistic, filters),
      );
    },
    onError: (_error, _variables, snapshot) => restore(queryClient, snapshot),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: transactionKeys.all(userId) }),
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();

  return useMutation({
    mutationKey: mutationKeys.update,
    mutationFn: ({
      previous,
      input,
    }: {
      previous: Transaction;
      input: TransactionInput;
    }) => updateTransaction({ id: previous.id, input }),
    onMutate: ({ previous, input }) => {
      const optimistic: Transaction = { ...previous, ...input };
      return updateAllLists(queryClient, userId, (data, filters) =>
        replaceTransaction(data, optimistic, filters),
      );
    },
    onError: (_error, _variables, snapshot) => restore(queryClient, snapshot),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: transactionKeys.all(userId) }),
  });
}

/** Doğrudan silme. Ekranlar bunun yerine useUndoDelete().scheduleDelete kullanır. */
export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();

  return useMutation({
    mutationKey: mutationKeys.delete,
    mutationFn: ({ id }: { id: string }) => deleteTransaction({ id }),
    onMutate: ({ id }) =>
      updateAllLists(queryClient, userId, (data) =>
        removeTransaction(data, id),
      ),
    onError: (_error, _variables, snapshot) => restore(queryClient, snapshot),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: transactionKeys.all(userId) }),
  });
}
