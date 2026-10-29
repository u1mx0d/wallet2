import { z } from "zod";

import { LIMITS } from "@/lib/appwrite/limits";

import { CATEGORY_ICON_KEYS } from "./constants";

export const transactionTypeSchema = z.enum(["income", "expense"]);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/** Appwrite'tan gelen kategori satırı. Bilinmeyen alanlar ($permissions vb.) atılır. */
const categoryRowSchema = z.object({
  $id: z.string().min(1),
  name: z.string().min(1),
  type: transactionTypeSchema,
  // Satırdaki ikon, uygulamanın bu sürümünde bilinmeyen bir anahtar olabilir; ekranda varsayılan ikon gösterilir.
  icon: z.string(),
  color: z.string(),
});

export type Category = {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
};

/** Geçersiz satırda null döner; çağıran taraf bu satırı atlar. */
export function parseCategoryRow(row: unknown): Category | null {
  const result = categoryRowSchema.safeParse(row);
  if (!result.success) return null;
  const { $id, ...rest } = result.data;
  return { id: $id, ...rest };
}

const categoryName = z
  .string()
  .trim()
  .min(1, "Kategori adını yaz.")
  .max(
    LIMITS.categoryNameMaxLength,
    `Kategori adı en fazla ${LIMITS.categoryNameMaxLength} karakter olabilir.`,
  );

const categoryIcon = z.enum(CATEGORY_ICON_KEYS);
const categoryColor = z.string().regex(HEX_COLOR, "Geçerli bir renk seç.");

export const categoryInputSchema = z.object({
  name: categoryName,
  type: transactionTypeSchema,
  icon: categoryIcon,
  color: categoryColor,
});

/** Güncellemede tür değiştirilemez: bağlı işlemler tutarsız hale gelirdi. */
export const categoryUpdateSchema = z.object({
  name: categoryName,
  icon: categoryIcon,
  color: categoryColor,
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;
