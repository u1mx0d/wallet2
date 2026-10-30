import { z } from "zod";

// Appwrite sınırı: ad en fazla 128 karakter (kayıt şemasıyla aynı).
const NAME_MAX = 128;

export const profileNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Adını yaz.")
    .max(NAME_MAX, `Ad en fazla ${NAME_MAX} karakter olabilir.`),
});
