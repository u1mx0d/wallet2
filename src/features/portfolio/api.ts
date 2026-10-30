import { ID, Query } from "react-native-appwrite";
import { z } from "zod";

import { functions, tablesDB, USER_TASKS } from "@/lib/appwrite/client";
import { DATABASE_ID, TABLES } from "@/lib/appwrite/schema";

import {
  parseQuoteRow,
  parseTradeRow,
  type Quote,
  type Trade,
  type TradeFields,
} from "./schemas";
import { foldForSearch } from "./search";

const PAGE_SIZE = 100;
const QUOTE_CHUNK_SIZE = 100;
const SEARCH_LIMIT = 20;

export function newTradeId(): string {
  return ID.unique();
}

function isDefined<T>(value: T | null): value is T {
  return value !== null;
}

/** Kullanıcının tüm işlemleri. Satırlar yalnızca sahibine okunabilir (sunucu izinleri). */
export async function fetchTrades(userId: string): Promise<Trade[]> {
  const rows: unknown[] = [];
  let cursor: string | undefined;
  for (;;) {
    const queries = [
      Query.equal("userId", userId),
      Query.orderDesc("date"),
      Query.limit(PAGE_SIZE),
    ];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const result = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.trades,
      queries,
    });
    rows.push(...result.rows);
    const last = result.rows[result.rows.length - 1];
    if (result.rows.length < PAGE_SIZE || !last) break;
    cursor = last.$id;
  }
  return rows.map(parseTradeRow).filter(isDefined);
}

/** Verilen sembollerin fiyatları (price_cache). */
export async function fetchQuotes(
  symbols: readonly string[],
): Promise<Quote[]> {
  const quotes: Quote[] = [];
  for (let index = 0; index < symbols.length; index += QUOTE_CHUNK_SIZE) {
    const chunk = symbols.slice(index, index + QUOTE_CHUNK_SIZE);
    const result = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.priceCache,
      queries: [Query.equal("symbol", [...chunk]), Query.limit(chunk.length)],
    });
    quotes.push(...result.rows.map(parseQuoteRow).filter(isDefined));
  }
  return quotes;
}

/** Sembol veya şirket adında arama. Tam sembol eşleşmesi en üstte. */
export async function searchSymbols(term: string): Promise<Quote[]> {
  const folded = foldForSearch(term);
  if (folded.length === 0) return [];

  const result = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLES.priceCache,
    queries: [
      Query.or([
        Query.startsWith("symbol", folded),
        Query.contains("name", folded),
      ]),
      Query.limit(SEARCH_LIMIT),
    ],
  });

  const rank = (quote: Quote) =>
    quote.symbol === folded ? 0 : quote.symbol.startsWith(folded) ? 1 : 2;
  return result.rows
    .map(parseQuoteRow)
    .filter(isDefined)
    .sort((a, b) => rank(a) - rank(b) || (a.symbol < b.symbol ? -1 : 1));
}

// ─── Sunucu: /trades ───────────────────────────────────────────────────────

export type TradeRequest =
  | { action: "create"; id: string; trade: TradeFields }
  | { action: "update"; id: string; trade: TradeFields }
  | { action: "delete"; id: string };

/** Sunucunun reddettiği işlem. message Türkçe ve kullanıcıya gösterilebilir. */
export class TradeRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "TradeRequestError";
  }
}

/**
 * Function 30 sn senkron sınırına takılırsa Appwrite gövdesiz bir hata döndürür. Bu durumda
 * işlem kaydedilmiş OLABİLİR. Aynı ekrandan tekrar göndermek güvenlidir: istek aynı ID'yi
 * taşıdığı için sunucu ikinci kayıt oluşturmaz.
 */
const TIMEOUT_MESSAGE =
  "Sunucu şu an yavaş yanıt veriyor. İşlem kaydedilmiş olabilir. Bu ekrandan tekrar kaydetmek " +
  "güvenlidir; aynı işlem iki kez eklenmez.";

const errorBodySchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

export async function submitTrade(request: TradeRequest): Promise<void> {
  const execution = await functions.createExecution({
    functionId: USER_TASKS.functionId,
    xpath: USER_TASKS.paths.trades,
    body: JSON.stringify(request),
    async: false,
  });

  if (execution.status === "completed" && execution.responseStatusCode === 200)
    return;

  let body: unknown = {};
  try {
    body = JSON.parse(execution.responseBody || "{}");
  } catch {
    body = {};
  }
  const parsed = errorBodySchema.safeParse(body);

  if (!parsed.success) {
    // Gövdesiz hata: büyük ihtimalle zaman aşımı veya Function'ın yarıda kesilmesi.
    throw new TradeRequestError(
      "timeout",
      TIMEOUT_MESSAGE,
      execution.responseStatusCode,
    );
  }

  throw new TradeRequestError(
    parsed.data.error,
    parsed.data.message ?? "İşlem kaydedilemedi. Lütfen tekrar dene.",
    execution.responseStatusCode,
  );
}
