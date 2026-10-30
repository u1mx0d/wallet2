// Appwrite SDK'sından ÖNCE yüklenmeli; bu yüzden ilk satırda.
import "react-native-url-polyfill/auto";
import "../global.css";

import { useIsRestoring } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { LogBox } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorState, Screen } from "@/components/ui";
import { useSession } from "@/features/auth/hooks";
import { getErrorMessage } from "@/lib/appwrite/errors";
import {
  persistOptions,
  registerMutationDefaults,
  resumeOwnPendingMutations,
} from "@/lib/offline-queue";
import { queryClient } from "@/lib/query-client";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";

/**
 * react-native-appwrite 3.1.0 bilinen sorunu: Realtime her bağlantıda tarayıcıya özgü
 * window.localStorage'ı okumaya çalışıyor, React Native'de bulunmadığı için hatayı yakalayıp
 * console.error ile yazıyor. Bağlantı çerezle doğrulandığı için Realtime ÇALIŞIYOR (ADIM 9c'de
 * doğrulandı); mesaj zararsız. Yalnızca bu mesaj geliştirme ekranında gizlenir; diğer tüm
 * hatalar görünmeye devam eder. Ayrıntı: docs/RISKS.md, 19. madde.
 */
LogBox.ignoreLogs(["Failed to parse cookie fallback"]);

// Kalıcı kuyruktaki işlemlerin uygulama yeniden açılınca gönderilebilmesi için (bkz. offline-queue.ts).
registerMutationDefaults(queryClient);

// Oturum kontrolü bitene kadar splash ekranı açık kalsın (giriş ekranı bir an görünüp kaybolmasın).
void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { theme, colors } = useTheme();
  const session = useSession();
  const isRestoring = useIsRestoring();
  const userId = session.data?.$id;

  useEffect(() => {
    if (!session.isPending) {
      void SplashScreen.hideAsync();
    }
  }, [session.isPending]);

  // Kuyruk diskten okunduktan ve oturum doğrulandıktan sonra bekleyen işlemleri gönder.
  useEffect(() => {
    if (!isRestoring && userId)
      void resumeOwnPendingMutations(queryClient, userId);
  }, [isRestoring, userId]);

  if (session.isPending) return null;

  if (session.isError) {
    return (
      <Screen contentClassName="justify-center">
        <StatusBar style={theme === "dark" ? "light" : "dark"} />
        <ErrorState
          title="Bağlanılamadı"
          description={getErrorMessage(session.error)}
          onRetry={() => void session.refetch()}
          retrying={session.isFetching}
        />
      </Screen>
    );
  }

  const isSignedIn = session.data !== null;

  return (
    <>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {/* SDK 58: koruma başarısız olunca nereye gidileceği AÇIKÇA belirtiliyor. */}
        <Stack.Protected guard={isSignedIn} redirectTo="/sign-in">
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!isSignedIn} redirectTo="/">
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={persistOptions}
      >
        <ThemeProvider>
          <RootNavigator />
        </ThemeProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
