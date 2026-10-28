import { AppwriteException, ID } from "react-native-appwrite";

import { account } from "@/lib/appwrite/client";

import type { SignInInput, SignUpInput } from "./schemas";

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
