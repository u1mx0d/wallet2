import { useCallback, useState } from "react";
import type { z } from "zod";

type FieldErrors<TValues> = Partial<Record<keyof TValues, string>>;

type ValidationResult<TOutput> = { ok: true; data: TOutput } | { ok: false };

/**
 * Metin alanlarından oluşan formlar için küçük Zod form hook'u.
 * - İlk gönderme denemesine kadar hata göstermez.
 * - İlk denemeden sonra her değişiklikte yeniden doğrular (hata düzelince kaybolur).
 * - Her alan için yalnızca ilk hata mesajını gösterir.
 */
export function useZodForm<TValues extends Record<string, string>, TOutput>(
  schema: z.ZodType<TOutput>,
  initialValues: TValues,
) {
  const [values, setValues] = useState<TValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors<TValues>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const validate = useCallback(
    (candidate: TValues): ValidationResult<TOutput> => {
      const result = schema.safeParse(candidate);
      if (result.success) {
        setErrors({});
        return { ok: true, data: result.data };
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

  const setValue = useCallback(
    (field: keyof TValues, value: string) => {
      const next = { ...values, [field]: value };
      setValues(next);
      if (submitAttempted) validate(next);
    },
    [values, submitAttempted, validate],
  );

  const handleSubmit = useCallback(
    (onValid: (data: TOutput) => void) => () => {
      setSubmitAttempted(true);
      const result = validate(values);
      if (result.ok) onValid(result.data);
    },
    [validate, values],
  );

  return { values, errors, setValue, handleSubmit };
}
