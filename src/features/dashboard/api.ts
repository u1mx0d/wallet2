import { Query } from "react-native-appwrite";

import {
    parseTransactionRow,
    type Transaction,
} from "@/features/transactions/schemas";
import { tablesDB } from "@/lib/appwrite/client";
import { DATABASE_ID, TABLES } from "@/lib/appwrite/schema";

const PAGE_SIZE = 100;
/** Bir dönem için çekilecek en fazla kayıt. Aşılırsa ekranda "özet eksik olabilir" uyarısı çıkar. */
export const RANGE_ROW_LIMIT = 5_000;

export type RangeResult = {
  transactions: Transaction[];
  /** true: sınıra ulaşıldı, toplamlar eksik olabilir. */
  truncated: boolean;
};

function isDefined<T>(value: T | null): value is T {
  return value !== null;
}

/** Aralıktaki tüm işlemler (dahil-dahil ISO sınırlar). userId_date indeksini kullanır. */
export async function fetchTransactionsInRange({
  userId,
  from,
  to,
}: {
  userId: string;
  from: string;
  to: string;
}): Promise<RangeResult> {
  const rows: unknown[] = [];
  let cursor: string | undefined;

  while (rows.length < RANGE_ROW_LIMIT) {
    const queries = [
      Query.equal("userId", userId),
      Query.greaterThanEqual("date", from),
      Query.lessThanEqual("date", to),
      Query.orderDesc("date"),
      Query.limit(PAGE_SIZE),
    ];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const result = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.transactions,
      queries,
    });
    rows.push(...result.rows);

    const last = result.rows[result.rows.length - 1];
    if (result.rows.length < PAGE_SIZE || !last) {
      return {
        transactions: rows.map(parseTransactionRow).filter(isDefined),
        truncated: false,
      };
    }
    cursor = last.$id;
  }

  return {
    transactions: rows.map(parseTransactionRow).filter(isDefined),
    truncated: true,
  };
}
