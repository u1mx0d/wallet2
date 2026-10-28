import { z } from "zod";

/**
 * Uygulamanın ortam değişkenleri. Yalnızca EXPO_PUBLIC_ önekli, GİZLİ OLMAYAN değerler.
 *
 * Expo bu değerleri derleme sırasında koda yerleştirir; bu yüzden her biri
 * aşağıdaki gibi `process.env.EXPO_PUBLIC_...` şeklinde AÇIKÇA yazılmalıdır.
 * Dinamik erişim (process.env[ad]) çalışmaz.
 */

const ENDPOINT_PATTERN = /^https:\/\/[^\s/]+(\/[^\s]*)?\/v1$/;
const PLATFORM_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

const envSchema = z.object({
  appwriteEndpoint: z
    .string()
    .min(1, "EXPO_PUBLIC_APPWRITE_ENDPOINT boş.")
    .refine((value) => ENDPOINT_PATTERN.test(value), {
      message:
        "EXPO_PUBLIC_APPWRITE_ENDPOINT https:// ile başlamalı ve /v1 ile bitmeli (ör. https://fra.cloud.appwrite.io/v1).",
    }),
  appwriteProjectId: z.string().min(1, "EXPO_PUBLIC_APPWRITE_PROJECT_ID boş."),
  appwriteDatabaseId: z
    .string()
    .min(1, "EXPO_PUBLIC_APPWRITE_DATABASE_ID boş."),
  appwritePlatform: z
    .string()
    .min(1, "EXPO_PUBLIC_APPWRITE_PLATFORM boş.")
    .refine((value) => PLATFORM_PATTERN.test(value), {
      message:
        "EXPO_PUBLIC_APPWRITE_PLATFORM küçük harfli, noktalı bir kimlik olmalı (ör. com.alperen.cuzdan).",
    }),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse({
  appwriteEndpoint: (process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ?? "").trim(),
  appwriteProjectId: (process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? "").trim(),
  appwriteDatabaseId: (
    process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID ?? ""
  ).trim(),
  appwritePlatform: (process.env.EXPO_PUBLIC_APPWRITE_PLATFORM ?? "").trim(),
});

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `• ${issue.message}`)
    .join("\n");
  throw new Error(
    `Ortam değişkenleri eksik veya hatalı. Proje kökündeki .env.local dosyasını kontrol et, ` +
      `ardından sunucuyu "npx expo start --clear" ile yeniden başlat.\n\n${details}`,
  );
}

export const env: Env = parsed.data;
