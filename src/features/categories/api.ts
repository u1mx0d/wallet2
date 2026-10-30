import { AppwriteException, ID, Query } from "react-native-appwrite";

import { functions, tablesDB, USER_TASKS } from "@/lib/appwrite/client";
import { ownerPermissions } from "@/lib/appwrite/permissions";
import { DATABASE_ID, TABLES } from "@/lib/appwrite/schema";

import { sortCategories } from "./cache";
import {
  parseCategoryRow,
  type Category,
  type CategoryInput,
  type CategoryUpdate,
} from "./schemas";

const PAGE_SIZE = 100;

/** Silinmek istenen kategoriye bağlı işlem var. */
export class CategoryInUseError extends Error {
  constructor() {
    super("Bu kategoriye bağlı işlemler var.");
    this.name = "CategoryInUseError";
  }
}

export function newCategoryId(): string {
  return ID.unique();
}

function isDefined<T>(value: T | null): value is T {
  return value !== null;
}

function toCategory(row: unknown): Category {
  const category = parseCategoryRow(row);
  if (!category) throw new Error("Sunucudan gelen kategori verisi geçersiz.");
  return category;
}

async function listAllCategories(userId: string): Promise<Category[]> {
  const rows: unknown[] = [];
  let cursor: string | undefined;

  for (;;) {
    const queries = [Query.equal("userId", userId), Query.limit(PAGE_SIZE)];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const result = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.categories,
      queries,
    });
    rows.push(...result.rows);

    const last = result.rows[result.rows.length - 1];
    if (result.rows.length < PAGE_SIZE || !last) break;
    cursor = last.$id;
  }

  return rows.map(parseCategoryRow).filter(isDefined);
}

/** user-tasks Function'ının /default-categories yolu. İdempotenttir; tekrar çağrılması güvenlidir. */
async function ensureDefaultCategories(): Promise<void> {
  const execution = await functions.createExecution({
    functionId: USER_TASKS.functionId,
    xpath: USER_TASKS.paths.defaultCategories,
    body: "{}",
    async: false,
  });
  if (
    execution.status !== "completed" ||
    execution.responseStatusCode !== 200
  ) {
    throw new Error("Varsayılan kategoriler oluşturulamadı.");
  }
}

/** Kullanıcının kategorileri. Hiç yoksa varsayılanları oluşturup tekrar okur. */
export async function fetchCategories(userId: string): Promise<Category[]> {
  let categories = await listAllCategories(userId);
  if (categories.length === 0) {
    await ensureDefaultCategories();
    categories = await listAllCategories(userId);
  }
  return sortCategories(categories);
}

export async function createCategory({
  userId,
  id,
  input,
}: {
  userId: string;
  id: string;
  input: CategoryInput;
}): Promise<Category> {
  try {
    const row = await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.categories,
      rowId: id,
      data: { userId, ...input },
      permissions: ownerPermissions(userId),
    });
    return toCategory(row);
  } catch (error) {
    // Aynı ID ile önceki deneme sunucuya ulaşmış: kaydı tekrar oluşturma, mevcut olanı oku.
    if (error instanceof AppwriteException && error.code === 409) {
      const row = await tablesDB.getRow({
        databaseId: DATABASE_ID,
        tableId: TABLES.categories,
        rowId: id,
      });
      return toCategory(row);
    }
    throw error;
  }
}

export async function updateCategory({
  id,
  input,
}: {
  id: string;
  input: CategoryUpdate;
}): Promise<Category> {
  const row = await tablesDB.updateRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.categories,
    rowId: id,
    data: input,
  });
  return toCategory(row);
}

/** Bağlı işlem varsa CategoryInUseError fırlatır. */
export async function deleteCategory({
  userId,
  id,
}: {
  userId: string;
  id: string;
}): Promise<void> {
  const usage = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLES.transactions,
    queries: [
      Query.equal("userId", userId),
      Query.equal("categoryId", id),
      Query.limit(1),
    ],
  });
  if (usage.rows.length > 0) throw new CategoryInUseError();

  try {
    await tablesDB.deleteRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.categories,
      rowId: id,
    });
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 404) return;
    throw error;
  }
}
