import { Account, Client, Functions, TablesDB } from "react-native-appwrite";

import { env } from "@/lib/env";

/**
 * Uygulama genelinde TEK Appwrite istemcisi.
 * URL polyfill'i src/app/_layout.tsx'in ilk satırında yükleniyor; bu dosyadan önce çalışır.
 */
export const appwriteClient = new Client()
  .setEndpoint(env.appwriteEndpoint)
  .setProject(env.appwriteProjectId)
  .setPlatform(env.appwritePlatform)
  // Appwrite'ın gönderdiği e-postalar ve sunucu mesajları için Türkçe tercihi.
  .setLocale("tr");

export const account = new Account(appwriteClient);
export const tablesDB = new TablesDB(appwriteClient);
export const functions = new Functions(appwriteClient);

/**
 * Kullanıcı adına sunucu işleri yapan Function ve yolları.
 * appwrite.config.json ve functions/user-tasks/src/main.js ile BİREBİR aynı olmalı.
 */
export const USER_TASKS = {
  functionId: "user-tasks",
  paths: {
    defaultCategories: "/default-categories",
    deleteAccount: "/delete-account",
    trades: "/trades",
  },
} as const;
