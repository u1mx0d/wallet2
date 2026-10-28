import { QueryClient } from "@tanstack/react-query";
import { AppwriteException } from "react-native-appwrite";

/**
 * 4xx hataları (yetkisiz, bulunamadı, geçersiz istek) tekrar denemekle düzelmez;
 * yalnızca ağ ve 5xx hatalarında en fazla 2 kez tekrar dene.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (
    error instanceof AppwriteException &&
    error.code >= 400 &&
    error.code < 500
  )
    return false;
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      staleTime: 30_000,
    },
    mutations: {
      // Yazma işlemleri otomatik tekrarlanmaz: aynı kaydın iki kez oluşmasını önler.
      retry: false,
    },
  },
});
