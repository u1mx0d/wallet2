import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type MutateOptions,
} from "@tanstack/react-query";
import { useMemo } from "react";

import { useCurrentUserId } from "@/features/auth/useCurrentUserId";
import {
  PERSISTED_MUTATION_KEYS,
  type TradeVariables,
} from "@/lib/offline-queue";

import {
  fetchQuotes,
  fetchTrades,
  searchSymbols,
  submitTrade,
  type TradeRequest,
} from "./api";
import { buildPortfolio, heldSymbols } from "./portfolio-view";
import { foldForSearch } from "./search";

export const portfolioKeys = {
  all: (userId: string) => ["portfolio", userId] as const,
  trades: (userId: string) => ["portfolio", userId, "trades"] as const,
};

export const priceKeys = {
  all: ["prices"] as const,
  /** Tüm fiyat listeleri (Realtime güncellemesi bunları hedefler). */
  quotesAll: ["prices", "quotes"] as const,
  quotes: (symbols: readonly string[]) =>
    ["prices", "quotes", symbols.join(",")] as const,
  search: (term: string) => ["prices", "search", term] as const,
};

export function useTrades() {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: portfolioKeys.trades(userId),
    queryFn: () => fetchTrades(userId),
  });
}

export function useQuotes(symbols: readonly string[]) {
  return useQuery({
    queryKey: priceKeys.quotes(symbols),
    queryFn: () => fetchQuotes(symbols),
    enabled: symbols.length > 0,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

/** İşlemler + fiyatlar → hesaplanmış portföy. Pozisyon saklanmaz; her seferinde hesaplanır. */
export function usePortfolio() {
  const trades = useTrades();
  const symbols = useMemo(() => heldSymbols(trades.data ?? []), [trades.data]);
  const quotes = useQuotes(symbols);

  const view = useMemo(
    () => (trades.data ? buildPortfolio(trades.data, quotes.data ?? []) : null),
    [trades.data, quotes.data],
  );

  return { trades, quotes, symbols, view };
}

export function useSymbolSearch(term: string) {
  const folded = foldForSearch(term);
  return useQuery({
    queryKey: priceKeys.search(folded),
    queryFn: () => searchSymbols(term),
    enabled: folded.length > 0,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

/**
 * Alım/satım ekleme, düzenleme, silme. Optimistic DEĞİL: sunucu kuralları (fazla satış vb.)
 * onaylamadan ekranda değişiklik gösterilmez. Değişkenlere kullanıcı ID'si hook tarafından
 * eklenir (kalıcı kuyruk için); sunucuya GÖNDERİLMEZ, kimlik sunucuda header'dan alınır.
 */
export function useTradeMutation() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();

  const mutation = useMutation({
    mutationKey: PERSISTED_MUTATION_KEYS.trade,
    mutationFn: ({ userId: _owner, ...request }: TradeVariables) =>
      submitTrade(request as TradeRequest),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: portfolioKeys.all(userId) }),
  });

  return {
    ...mutation,
    mutate: (
      request: TradeRequest,
      options?: MutateOptions<void, Error, TradeVariables, unknown>,
    ) => mutation.mutate({ ...request, userId }, options),
  };
}
