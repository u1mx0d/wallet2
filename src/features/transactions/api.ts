import { AppwriteException, ID, Query } from "react-native-appwrite";

import { tablesDB } from "@/lib/appwrite/client";
import { ownerPermissions } from "@/lib/appwrite/permissions";
import { DATABASE_ID, TABLES } from "@/lib/appwrite/schema";

import type { TransactionFilters, TransactionPage } from "./cache";
import {
    parseTransactionRow,
    type Transaction,
    type TransactionInput,
} from "./schemas";

export const TRANSACTIONS_PAGE_SIZE = 25;

export function newTransactionId(): string {
  return ID.unique();
}

function isDefined<T>(value: T | null): value is T {
  return value !== null;
}

function toTransaction(row: unknown): Transaction {
  const transaction = parseTransactionRow(row);
  if (!transaction) throw new Error("Sunucudan gelen işlem verisi geçersiz.");
  return transaction;
}

export async function fetchTransactionsPage({
  userId,
  filters,
  cursor,
}: {
  userId: string;
  filters: TransactionFilters;
  cursor: string | null;
}): Promise<TransactionPage> {
  // userId ilk filtre: userId_date ve userId_category_date indeksleri kullanılır.
  const queries = [Query.equal("userId", userId)];
  if (filters.type) queries.push(Query.equal("type", filters.type));
  if (filters.categoryId)
    queries.push(Query.equal("categoryId", filters.categoryId));
  if (filters.from) queries.push(Query.greaterThanEqual("date", filters.from));
  if (filters.to) queries.push(Query.lessThanEqual("date", filters.to));
  queries.push(Query.orderDesc("date"), Query.limit(TRANSACTIONS_PAGE_SIZE));
  if (cursor) queries.push(Query.cursorAfter(cursor));

  const result = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLES.transactions,
    queries,
  });

  const last = result.rows[result.rows.length - 1];
  return {
    items: result.rows.map(parseTransactionRow).filter(isDefined),
    nextCursor:
      result.rows.length === TRANSACTIONS_PAGE_SIZE && last ? last.$id : null,
  };
}

export async function createTransaction({
  userId,
  id,
  input,
}: {
  userId: string;
  id: string;
  input: TransactionInput;
}): Promise<Transaction> {
  try {
    const row = await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.transactions,
      rowId: id,
      data: { userId, ...input },
      permissions: ownerPermissions(userId),
    });
    return toTransaction(row);
  } catch (error) {
    // Aynı ID ile önceki deneme sunucuya ulaşmış: tekrar oluşturma, mevcut kaydı oku.
    if (error instanceof AppwriteException && error.code === 409) {
      const row = await tablesDB.getRow({
        databaseId: DATABASE_ID,
        tableId: TABLES.transactions,
        rowId: id,
      });
      return toTransaction(row);
    }
    throw error;
  }
}

export async function updateTransaction({
  id,
  input,
}: {
  id: string;
  input: TransactionInput;
}): Promise<Transaction> {
  const row = await tablesDB.updateRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.transactions,
    rowId: id,
    data: input,
  });
  return toTransaction(row);
}

export async function deleteTransaction({ id }: { id: string }): Promise<void> {
  try {
    await tablesDB.deleteRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.transactions,
      rowId: id,
    });
  } catch (error) {
    // Zaten silinmiş: istenen sonuç sağlanmış.
    if (error instanceof AppwriteException && error.code === 404) return;
    throw error;
  }
}
