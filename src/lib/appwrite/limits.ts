import { MAX_AMOUNT_MINOR } from "@/domain/money";

/**
 * Sunucudaki kolon sınırlarının istemci karşılıkları (scripts/appwrite/setup.mjs ile aynı).
 * Bu dosya env'e bağlı DEĞİLDİR; birim testlerden güvenle import edilebilir.
 */
export const LIMITS = {
  /** Kuruş cinsinden en büyük tutar (≈ 10 milyar TL). Kaynak: src/domain/money.ts */
  maxAmountMinor: MAX_AMOUNT_MINOR,
  maxLots: 1_000_000_000,
  categoryNameMaxLength: 50,
  noteMaxLength: 500,
  symbolMaxLength: 12,
} as const;
