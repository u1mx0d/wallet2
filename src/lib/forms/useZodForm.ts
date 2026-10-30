import { useCallback, useState } from "react";
import type { z } from "zod";

type FieldErrors<TValues> = Partial<Record<keyof TValues, string>>;

type ValidationResult<TOutput> = { ok: true; data: TOutput } | { ok: false };

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- giriş/çıkış tipi şemadan okunur
type AnySchema = z.ZodType<any, any, any>;

/**
 * Metin alanlarından oluşan formlar için küçük Zod form hook'u.
 * - İlk gönderme denemesine kadar hata göstermez.
 * - İlk denemeden sonra her değişiklikte yeniden doğrular (hata düzelince kaybolur).
 * - Her alan için yalnızca ilk hata mesajını gösterir.
 * - Şemanın girişi (metin alanları) ile çıkışı farklı olabilir (ör. "1.234,56" → 123456).
 *   Çıktı tipi şemanın kendisinden okunur: z.output<TSchema>.
 *
 * ÖNEMLİ: Birden fazla alanı birlikte değiştirmek için setFields kullan. Arka arkaya iki setValue
 * çağrısı aynı eski değerlerden başladığı için ilk değişiklik kaybolur.
 */
export function useZodForm<
  TValues extends Record<string, string>,
  TSchema extends AnySchema,
>(schema: TSchema, initialValues: TValues) {
  type TOutput = z.output<TSchema>;

  const [values, setValues] = useState<TValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors<TValues>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const validate = useCallback(
    (candidate: TValues): ValidationResult<TOutput> => {
      const result = schema.safeParse(candidate);
      if (result.success) {
        setErrors({});
        return { ok: true, data: result.data as TOutput };
      }
      const nextErrors: FieldErrors<TValues> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (typeof field !== "string" || !(field in candidate)) continue;
        const key = field as keyof TValues;
        if (nextErrors[key] === undefined) nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      return { ok: false };
    },
    [schema],
  );

  /** Bir veya birden fazla alanı TEK seferde değiştirir. */
  const setFields = useCallback(
    (patch: Partial<TValues>) => {
      const next = { ...values, ...patch };
      setValues(next);
      if (submitAttempted) validate(next);
    },
    [values, submitAttempted, validate],
  );

  const setValue = useCallback(
    (field: keyof TValues, value: string) =>
      setFields({ [field]: value } as Partial<TValues>),
    [setFields],
  );

  const handleSubmit = useCallback(
    (onValid: (data: TOutput) => void) => () => {
      setSubmitAttempted(true);
      const result = validate(values);
      if (result.ok) onValid(result.data);
    },
    [validate, values],
  );

  return { values, errors, setValue, setFields, handleSubmit };
}
