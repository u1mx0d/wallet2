import { z } from "zod";

// Appwrite sınırları: şifre 8-256 karakter, ad en fazla 128 karakter.
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 256;
const NAME_MAX = 128;
export const RECOVERY_CODE_LENGTH = 6;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "E-posta adresini yaz.")
  .email("Geçerli bir e-posta adresi yaz.");

/** Kayıt ve şifre sıfırlamada aynı kural. */
const newPassword = z
  .string()
  .min(PASSWORD_MIN, `Şifre en az ${PASSWORD_MIN} karakter olmalı.`)
  .max(PASSWORD_MAX, `Şifre en fazla ${PASSWORD_MAX} karakter olabilir.`);

const confirmPassword = z.string().min(1, "Şifreni tekrar yaz.");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Şifreni yaz."),
});

export const signUpSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Adını yaz.")
      .max(NAME_MAX, `Ad en fazla ${NAME_MAX} karakter olabilir.`),
    email,
    password: newPassword,
    confirmPassword,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Şifreler eşleşmiyor.",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email,
});

export const resetPasswordSchema = z
  .object({
    code: z
      .string()
      .regex(
        new RegExp(`^\\d{${RECOVERY_CODE_LENGTH}}$`),
        `E-postadaki ${RECOVERY_CODE_LENGTH} haneli kodu yaz.`,
      ),
    password: newPassword,
    confirmPassword,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Şifreler eşleşmiyor.",
    path: ["confirmPassword"],
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
