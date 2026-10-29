import {
    useInfiniteQuery,
    useMutation,
    useQueryClient,
    type QueryClient,
    type QueryKey,
} from "@tanstack/react-query";

import { useCurrentUserId } from "@/features/auth/useCurrentUserId";

import {
    createTransaction,
    deleteTransaction,
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
  /** Kullanıcının tüm işlem sorguları (listeler ve ileride dashboard toplamları). */
  all: (userId: string) => ["transactions", userId] as const,
  lists: (userId: string) => ["transactions", userId, "list"] as const,
  list: (userId: string, filters: TransactionFilters) =>
    ["transactions", userId, "list", filters] as const,
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

/** Çağıran, ID'yi newTransactionId() ile üretir (optimistic kayıt ve tekrar deneme güvenliği için). */
export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();

  return useMutation({
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

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();

  return useMutation({
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
