import { z } from "zod";

import {
  MAX_AMOUNT_MINOR,
  MONEY_PARSE_ERROR_MESSAGES,
  parseTryInput,
} from "@/domain/money";
import {
  transactionTypeSchema,
  type TransactionType,
} from "@/features/categories/schemas";
import { LIMITS } from "@/lib/appwrite/limits";

/** "2026-10-28T09:00:00.000+00:00" gibi ISO 8601 tarih-saat. */
export function isIsoDateTime(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value));
}

const transactionRowSchema = z.object({
  $id: z.string().min(1),
  $createdAt: z.string().refine(isIsoDateTime),
  type: transactionTypeSchema,
  amountMinor: z.number().int().min(1).max(MAX_AMOUNT_MINOR),
  categoryId: z.string().min(1),
  note: z.string().nullable().optional(),
  date: z.string().refine(isIsoDateTime),
});

export type Transaction = {
  id: string;
  type: TransactionType;
  /** Kuruş cinsinden, her zaman pozitif. Gelir/gider ayrımı `type` ile yapılır. */
  amountMinor: number;
  categoryId: string;
  note: string | null;
  /** İşlemin tarihi (ISO). Kullanıcı seçer; listeler buna göre sıralanır. */
  date: string;
  /** Kaydın oluşturulma zamanı (ISO). Sunucu belirler; aynı tarihli işlemlerde sıralama için. */
  createdAt: string;
};

/** Geçersiz satırda null döner; çağıran taraf bu satırı atlar. */
export function parseTransactionRow(row: unknown): Transaction | null {
  const result = transactionRowSchema.safeParse(row);
  if (!result.success) return null;
  const { $id, $createdAt, note, ...rest } = result.data;
  return { id: $id, createdAt: $createdAt, note: note ?? null, ...rest };
}

/** Ekleme/düzenleme verisi. Not boşsa null olarak kaydedilir. */
export const transactionInputSchema = z.object({
  type: transactionTypeSchema,
  amountMinor: z
    .number()
    .int("Tutar kuruş cinsinden tam sayı olmalı.")
    .min(1, "Tutar en az ₺0,01 olmalı.")
    .max(MAX_AMOUNT_MINOR, "Tutar çok büyük."),
  categoryId: z.string().min(1, "Kategori seç."),
  note: z
    .string()
    .trim()
    .max(
      LIMITS.noteMaxLength,
      `Not en fazla ${LIMITS.noteMaxLength} karakter olabilir.`,
    )
    .transform((value) => (value.length === 0 ? null : value)),
  date: z.string().refine(isIsoDateTime, "Geçerli bir tarih seç."),
});

export type TransactionInput = z.output<typeof transactionInputSchema>;

/** Kullanıcının yazdığı tutar metni → kuruş. Hata mesajları Türkçe. */
const amountField = z.string().transform((value, ctx) => {
  const parsed = parseTryInput(value);
  if (!parsed.ok) {
    ctx.addIssue({
      code: "custom",
      message: MONEY_PARSE_ERROR_MESSAGES[parsed.error],
    });
    return z.NEVER;
  }
  if (parsed.value < 1) {
    ctx.addIssue({ code: "custom", message: "Tutar en az ₺0,01 olmalı." });
    return z.NEVER;
  }
  return parsed.value;
});

/**
 * Form alanları (hepsi metin) → TransactionInput.
 * Alan adları: type, amount, categoryId, note, date (ISO).
 */
export const transactionFormSchema = z
  .object({
    type: transactionTypeSchema,
    amount: amountField,
    categoryId: z.string().min(1, "Kategori seç."),
    note: z.string(),
    date: z.string(),
  })
  .transform(({ amount, ...rest }) => ({ ...rest, amountMinor: amount }))
  .pipe(transactionInputSchema);
