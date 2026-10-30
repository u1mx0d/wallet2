import { z } from "zod";

import {
    MAX_AMOUNT_MINOR,
    MONEY_PARSE_ERROR_MESSAGES,
    parseTryInput,
} from "@/domain/money";
import {
    isValidSymbol,
    MAX_LOTS,
    normalizeSymbol,
    type TradeSide,
} from "@/domain/portfolio";

function isIsoDateTime(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value));
}

// ─── Satırlar ──────────────────────────────────────────────────────────────

const tradeRowSchema = z.object({
  $id: z.string().min(1),
  $createdAt: z.string().refine(isIsoDateTime),
  symbol: z.string().min(1),
  side: z.enum(["buy", "sell"]),
  lots: z.number().int().min(1).max(MAX_LOTS),
  priceMinor: z.number().int().min(1).max(MAX_AMOUNT_MINOR),
  feeMinor: z.number().int().min(0).max(MAX_AMOUNT_MINOR).nullable().optional(),
  date: z.string().refine(isIsoDateTime),
});

export type Trade = {
  id: string;
  symbol: string;
  side: TradeSide;
  lots: number;
  priceMinor: number;
  feeMinor: number;
  date: string;
  createdAt: string;
};

export function parseTradeRow(row: unknown): Trade | null {
  const result = tradeRowSchema.safeParse(row);
  if (!result.success) return null;
  const { $id, $createdAt, feeMinor, ...rest } = result.data;
  return { id: $id, createdAt: $createdAt, feeMinor: feeMinor ?? 0, ...rest };
}

const quoteRowSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().nullable().optional(),
  priceMinor: z.number().int().min(1).max(MAX_AMOUNT_MINOR),
  prevCloseMinor: z
    .number()
    .int()
    .min(1)
    .max(MAX_AMOUNT_MINOR)
    .nullable()
    .optional(),
  updatedAt: z.string().refine(isIsoDateTime),
  source: z.string(),
  stale: z.boolean().nullable().optional(),
});

export type Quote = {
  symbol: string;
  name: string;
  priceMinor: number;
  prevCloseMinor: number | null;
  /** Sağlayıcıdaki fiyat zamanı (ISO). */
  updatedAt: string;
  /** "burkut" veya "test-verisi". */
  source: string;
  stale: boolean;
};

export function parseQuoteRow(row: unknown): Quote | null {
  const result = quoteRowSchema.safeParse(row);
  if (!result.success) return null;
  const { name, prevCloseMinor, stale, ...rest } = result.data;
  return {
    ...rest,
    name: name && name.length > 0 ? name : rest.symbol,
    prevCloseMinor: prevCloseMinor ?? null,
    stale: stale ?? false,
  };
}

// ─── Form ──────────────────────────────────────────────────────────────────

/** "1.000" veya "1000" → 1000. Lot her zaman tam sayıdır. */
const lotsField = z.string().transform((value, ctx) => {
  const digits = value.replace(/[\s.]/g, "");
  if (!/^\d+$/.test(digits)) {
    ctx.addIssue({
      code: "custom",
      message: "Lot sayısını tam sayı olarak yaz.",
    });
    return z.NEVER;
  }
  const lots = Number(digits);
  if (lots < 1 || lots > MAX_LOTS) {
    ctx.addIssue({ code: "custom", message: "Lot sayısı en az 1 olmalı." });
    return z.NEVER;
  }
  return lots;
});

const priceField = z.string().transform((value, ctx) => {
  const parsed = parseTryInput(value);
  if (!parsed.ok) {
    ctx.addIssue({
      code: "custom",
      message: MONEY_PARSE_ERROR_MESSAGES[parsed.error],
    });
    return z.NEVER;
  }
  if (parsed.value < 1) {
    ctx.addIssue({ code: "custom", message: "Fiyat en az ₺0,01 olmalı." });
    return z.NEVER;
  }
  return parsed.value;
});

/** Boş bırakılırsa 0. */
const feeField = z.string().transform((value, ctx) => {
  if (value.trim().length === 0) return 0;
  const parsed = parseTryInput(value);
  if (!parsed.ok) {
    ctx.addIssue({
      code: "custom",
      message: MONEY_PARSE_ERROR_MESSAGES[parsed.error],
    });
    return z.NEVER;
  }
  return parsed.value;
});

/** Form alanları (hepsi metin) → sunucuya gönderilecek işlem alanları. */
export const tradeFormSchema = z
  .object({
    symbol: z
      .string()
      .transform(normalizeSymbol)
      .refine(isValidSymbol, "Listeden bir hisse seç."),
    side: z.enum(["buy", "sell"]),
    lots: lotsField,
    price: priceField,
    fee: feeField,
    date: z.string().refine(isIsoDateTime, "Geçerli bir tarih seç."),
  })
  .transform(({ price, fee, ...rest }) => ({
    ...rest,
    priceMinor: price,
    feeMinor: fee,
  }));

export type TradeFields = z.output<typeof tradeFormSchema>;
