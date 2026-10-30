/**
 * Bağlantı bekleyen yazma işlemlerinin (mutation) telefonda kalıcı olarak saklanması.
 *
 * - Yalnızca BEKLEYEN (paused) ve kalıcı kuyruğa uygun işlemler saklanır. Okunan veriler
 *   (listeler, dashboard) SAKLANMAZ: finansal geçmişi şifrelenmemiş depoda tutmamak için.
 * - Fonksiyonlar diske yazılamaz; uygulama yeniden açılınca işlemler, burada kayıtlı
 *   varsayılan tanımlarla (setMutationDefaults) gönderilir.
 * - Her işlem onu oluşturan kullanıcının ID'sini taşır (variables.userId); başka kullanıcıya
 *   ait bekleyen işlemler gönderilmeden silinir.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { Mutation, QueryClient } from "@tanstack/react-query";
import type { PersistQueryClientOptions } from "@tanstack/react-query-persist-client";
import Constants from "expo-constants";

import { submitTrade, type TradeRequest } from "@/features/portfolio/api";
import {
    createTransaction,
    deleteTransaction,
    updateTransaction,
} from "@/features/transactions/api";
import type {
    Transaction,
    TransactionInput,
} from "@/features/transactions/schemas";

/** Kalıcı kuyruğa alınan işlem anahtarları (hooks dosyalarındaki mutationKey'lerle aynı). */
export const PERSISTED_MUTATION_KEYS = {
  createTransaction: ["transactions", "create"],
  updateTransaction: ["transactions", "update"],
  deleteTransaction: ["transactions", "delete"],
  trade: ["portfolio", "trade"],
} as const;

/** Her kalıcı işlemin değişkenleri, sahibinin kullanıcı ID'sini taşır. */
export type Owned<T> = T & { userId: string };

export type CreateTransactionVariables = Owned<{
  id: string;
  input: TransactionInput;
}>;
export type UpdateTransactionVariables = Owned<{
  previous: Transaction;
  input: TransactionInput;
}>;
export type DeleteTransactionVariables = Owned<{ id: string }>;
export type TradeVariables = Owned<TradeRequest>;

const PERSISTED_KEY_STRINGS = new Set(
  Object.values(PERSISTED_MUTATION_KEYS).map((key) => key.join("/")),
);

function isPersistable(
  mutation: Mutation<unknown, Error, unknown, unknown>,
): boolean {
  const key = mutation.options.mutationKey;
  return Array.isArray(key) && PERSISTED_KEY_STRINGS.has(key.join("/"));
}

function ownerOf(
  mutation: Mutation<unknown, Error, unknown, unknown>,
): string | null {
  const variables = mutation.state.variables;
  if (variables && typeof variables === "object" && "userId" in variables) {
    const { userId } = variables as { userId: unknown };
    return typeof userId === "string" ? userId : null;
  }
  return null;
}

/**
 * Uygulama yeniden açıldığında bekleyen işlemleri göndermek için gereken tanımlar.
 * Ekranlardaki hook'lar optimistic güncelleme vb. ekler; burada yalnızca gönderme işlevi var.
 */
export function registerMutationDefaults(queryClient: QueryClient): void {
  queryClient.setMutationDefaults(PERSISTED_MUTATION_KEYS.createTransaction, {
    mutationFn: ({ userId, id, input }: CreateTransactionVariables) =>
      createTransaction({ userId, id, input }),
  });
  queryClient.setMutationDefaults(PERSISTED_MUTATION_KEYS.updateTransaction, {
    mutationFn: ({ previous, input }: UpdateTransactionVariables) =>
      updateTransaction({ id: previous.id, input }),
  });
  queryClient.setMutationDefaults(PERSISTED_MUTATION_KEYS.deleteTransaction, {
    mutationFn: ({ id }: DeleteTransactionVariables) =>
      deleteTransaction({ id }),
  });
  queryClient.setMutationDefaults(PERSISTED_MUTATION_KEYS.trade, {
    // Kimlik sunucuda header'dan alınır; gövdeye kullanıcı ID'si gönderilmez.
    mutationFn: ({ userId: _owner, ...request }: TradeVariables) =>
      submitTrade(request as TradeRequest),
  });
}

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "wallet.pendingMutations",
});

/** 7 günden eski bekleyen işlemler atılır. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const persistOptions: Omit<PersistQueryClientOptions, "queryClient"> = {
  persister,
  maxAge: MAX_AGE_MS,
  // Uygulama sürümü değişince kuyruk sıfırlanır (eski veri biçimi gönderilmesin).
  buster: Constants.expoConfig?.version ?? "dev",
  dehydrateOptions: {
    shouldDehydrateQuery: () => false,
    shouldDehydrateMutation: (mutation) =>
      mutation.state.isPaused && isPersistable(mutation),
  },
};

/**
 * Oturum açıkken çağrılır: başka kullanıcıya ait bekleyen işlemleri siler, kalanları gönderir,
 * ardından verileri sunucudan tazeler.
 */
export async function resumeOwnPendingMutations(
  queryClient: QueryClient,
  userId: string,
): Promise<void> {
  const cache = queryClient.getMutationCache();
  for (const mutation of cache.getAll()) {
    if (
      isPersistable(mutation) &&
      mutation.state.isPaused &&
      ownerOf(mutation) !== userId
    ) {
      cache.remove(mutation);
    }
  }
  await queryClient.resumePausedMutations();
  await queryClient.invalidateQueries();
}
