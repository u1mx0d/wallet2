import NetInfo from "@react-native-community/netinfo";
import {
  focusManager,
  onlineManager,
  QueryClient,
} from "@tanstack/react-query";
import { AppState } from "react-native";
import { AppwriteException } from "react-native-appwrite";

/**
 * Bağlantı durumu: çevrimdışıyken sorgular beklemeye alınır, yazma işlemleri (mutation)
 * "paused" olur ve bağlantı gelince otomatik gönderilir.
 * isInternetReachable başlangıçta null olabilir; null "bilinmiyor" demektir, çevrimiçi sayılır.
 */
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(
      state.isConnected !== false && state.isInternetReachable !== false,
    );
  }),
);

/** Uygulama ön plana gelince eskimiş sorgular yenilenir. */
focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener("change", (status) => {
    setFocused(status === "active");
  });
  return () => subscription.remove();
});

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
