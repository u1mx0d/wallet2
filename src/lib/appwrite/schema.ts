import { env } from "@/lib/env";

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

/**
 * Sunucudaki kolon sınırlarının istemci karşılıkları.
 * Zod şemaları (ADIM 3-4) bu sabitleri kullanacak; sınırlar tek yerden değişsin diye burada.
 */
export const LIMITS = {
  /** Kuruş cinsinden en büyük tutar (≈ 10 milyar TL). */
  maxAmountMinor: 999_999_999_999,
  maxLots: 1_000_000_000,
  categoryNameMaxLength: 50,
  noteMaxLength: 500,
  symbolMaxLength: 12,
} as const;
