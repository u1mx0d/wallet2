import { AppwriteException, ID } from "react-native-appwrite";

import { account, functions, USER_TASKS } from "@/lib/appwrite/client";

import type { ForgotPasswordInput, SignInInput, SignUpInput } from "./schemas";

export type AuthUser = Awaited<ReturnType<typeof account.get>>;

/** Oturum yoksa null döner; ağ hatası gibi diğer hataları fırlatır. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    return await account.get();
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 401) return null;
    throw error;
  }
}

export async function signIn({
  email,
  password,
}: SignInInput): Promise<AuthUser> {
  try {
    await account.createEmailPasswordSession({ email, password });
  } catch (error) {
    // Cihazda eski bir oturum kalmışsa onu kapatıp bir kez daha dene.
    if (
      error instanceof AppwriteException &&
      error.type === "user_session_already_exists"
    ) {
      await account.deleteSession({ sessionId: "current" });
      await account.createEmailPasswordSession({ email, password });
    } else {
      throw error;
    }
  }
  return account.get();
}

export async function signUp({
  name,
  email,
  password,
}: SignUpInput): Promise<AuthUser> {
  await account.create({ userId: ID.unique(), email, password, name });
  return signIn({ email, password });
}

export async function signOut(): Promise<void> {
  try {
    await account.deleteSession({ sessionId: "current" });
  } catch (error) {
    // Oturum zaten yoksa (401) çıkış yapılmış sayılır.
    if (error instanceof AppwriteException && error.code === 401) return;
    throw error;
  }
}

/** Function çalıştı ama silme tamamlanamadı (ör. süre sınırı, sunucu hatası). */
export class AccountDeletionError extends Error {
  constructor(public readonly statusCode: number) {
    super(`Hesap silme tamamlanamadı (HTTP ${statusCode}).`);
    this.name = "AccountDeletionError";
  }
}

/**
 * Hesabı ve tüm verileri sunucuda siler. Kimlik, Appwrite'ın eklediği
 * x-appwrite-user-id header'ından belirlenir; gövdeye kimlik bilgisi konmaz.
 */
export async function deleteAccount(): Promise<void> {
  const execution = await functions.createExecution({
    functionId: USER_TASKS.functionId,
    xpath: USER_TASKS.paths.deleteAccount,
    body: "{}",
    async: false,
  });

  if (
    execution.status !== "completed" ||
    execution.responseStatusCode !== 200
  ) {
    throw new AccountDeletionError(execution.responseStatusCode);
  }
}

export type PasswordRecoveryRequest = {
  /** Kod onaylanırken gereken kullanıcı ID'si. Hesap yoksa Appwrite rastgele bir ID döner. */
  userId: string;
  /** E-postada da yazan güvenlik ifadesi; kullanıcı e-postanın kendi isteğine ait olduğunu doğrular. */
  phrase: string | null;
};

/**
 * E-postaya 6 haneli şifre sıfırlama kodu gönderir (15 dakika geçerli, tek kullanımlık).
 * Hesap olsun olmasın aynı şekilde başarılı döner; hangi e-postaların kayıtlı olduğu açığa çıkmaz.
 */
export async function requestPasswordRecovery({
  email,
}: ForgotPasswordInput): Promise<PasswordRecoveryRequest> {
  const token = await account.createRecoveryOTP({ email, phrase: true });
  const phrase =
    "phrase" in token &&
    typeof token.phrase === "string" &&
    token.phrase.length > 0
      ? token.phrase
      : null;
  return { userId: token.userId, phrase };
}

/** Kodu doğrulayıp yeni şifreyi kaydeder. Oturum AÇMAZ; ardından signIn çağrılmalı. */
export async function confirmPasswordRecovery({
  userId,
  code,
  password,
}: {
  userId: string;
  code: string;
  password: string;
}): Promise<void> {
  await account.updateRecoveryOTP({ userId, secret: code, password });
}
