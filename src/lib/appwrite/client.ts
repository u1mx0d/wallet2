import { Account, Client, TablesDB } from "react-native-appwrite";

import { env } from "@/lib/env";

/**
 * Uygulama genelinde TEK Appwrite istemcisi.
 * URL polyfill'i src/app/_layout.tsx'in ilk satırında yükleniyor; bu dosyadan önce çalışır.
 */
export const appwriteClient = new Client()
  .setEndpoint(env.appwriteEndpoint)
  .setProject(env.appwriteProjectId)
  .setPlatform(env.appwritePlatform);

export const account = new Account(appwriteClient);
export const tablesDB = new TablesDB(appwriteClient);
