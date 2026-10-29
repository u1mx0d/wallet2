import { env } from "@/lib/env";

export { LIMITS } from "./limits";

/**
 * Appwrite tablo ID'leri. scripts/appwrite/setup.mjs ile BİREBİR aynı olmalı.
 */
export const DATABASE_ID = env.appwriteDatabaseId;

export const TABLES = {
  categories: "categories",
  transactions: "transactions",
  trades: "trades",
  priceCache: "price_cache",
} as const;

export type TableId = (typeof TABLES)[keyof typeof TABLES];
