import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import { useCurrentUserId } from "@/features/auth/useCurrentUserId";
import type { RangeResult } from "@/features/dashboard/api";
import {
  rangeBoundsFromKey,
  removeFromRange,
  upsertInRange,
} from "@/features/dashboard/rangeCache";

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
  /** Dashboard dönem aralıkları (bkz. features/dashboard/hooks.ts → dashboardKeys.range). */
  ranges: (userId: string) => ["transactions", userId, "range"] as const,
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

type Snapshot = Array<[QueryKey, unknown]>;

type Change =
  | { kind: "upsert"; transaction: Transaction }
  | { kind: "remove"; id: string };

/**
 * Optimistic değişikliği önbellekteki TÜM işlem listelerine (her filtre ayrı liste) ve
 * TÜM dashboard aralıklarına uygular. Geri almak için önceki halleri döner.
 */
async function applyChange(
  queryClient: QueryClient,
  userId: string,
  change: Change,
): Promise<Snapshot> {
  await queryClient.cancelQueries({ queryKey: transactionKeys.all(userId) });
  const snapshot: Snapshot = [];

  for (const [key, data] of queryClient.getQueriesData<TransactionPages>({
    queryKey: transactionKeys.lists(userId),
  })) {
    if (!data) continue;
    snapshot.push([key, data]);
    const filters = (key[3] ?? {}) as TransactionFilters;
    queryClient.setQueryData(
      key,
      change.kind === "remove"
        ? removeTransaction(data, change.id)
        : insertTransaction(data, change.transaction, filters),
    );
  }

  for (const [key, data] of queryClient.getQueriesData<RangeResult>({
    queryKey: transactionKeys.ranges(userId),
  })) {
    const bounds = rangeBoundsFromKey(key);
    if (!data || !bounds) continue;
    snapshot.push([key, data]);
    queryClient.setQueryData(
      key,
      change.kind === "remove"
        ? removeFromRange(data, change.id)
        : upsertInRange(data, change.transaction, bounds.from, bounds.to),
    );
  }

  return snapshot;
}

function restore(
  queryClient: QueryClient,
  snapshot: Snapshot | undefined,
): void {
  if (!snapshot) return;
  for (const [key, data] of snapshot) queryClient.setQueryData(key, data);
}

/** Geri alınabilir silme için: işlemi sunucuya dokunmadan listelerden VE dashboard'dan kaldırır. */
export function removeFromTransactionLists(
  queryClient: QueryClient,
  userId: string,
  id: string,
): Promise<Snapshot> {
  return applyChange(queryClient, userId, { kind: "remove", id });
}

/** Geri alma: işlemi listelerde ve dashboard'da (filtreye/aralığa uyuyorsa) doğru yerine koyar. */
export function restoreToTransactionLists(
  queryClient: QueryClient,
  userId: string,
  transaction: Transaction,
): Promise<Snapshot> {
  return applyChange(queryClient, userId, { kind: "upsert", transaction });
}

/** Çağıran, ID'yi newTransactionId() ile üretir (optimistic kayıt ve tekrar deneme güvenliği için). */
export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();

  return useMutation({
    mutationKey: mutationKeys.create,
    mutationFn: ({ id, input }: { id: string; input: TransactionInput }) =>
      createTransaction({ userId, id, input }),
    onMutate: ({ id, input }) =>
      applyChange(queryClient, userId, {
        kind: "upsert",
        transaction: { id, ...input, createdAt: new Date().toISOString() },
      }),
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
    onMutate: ({ previous, input }) =>
      applyChange(queryClient, userId, {
        kind: "upsert",
        transaction: { ...previous, ...input },
      }),
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
      applyChange(queryClient, userId, { kind: "remove", id }),
    onError: (_error, _variables, snapshot) => restore(queryClient, snapshot),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: transactionKeys.all(userId) }),
  });
}
