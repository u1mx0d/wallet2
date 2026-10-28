// Appwrite SDK'sından ÖNCE yüklenmeli; bu yüzden ilk satırda.
import "react-native-url-polyfill/auto";
import "../global.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorState, Screen } from "@/components/ui";
import { useSession } from "@/features/auth/hooks";
import { getErrorMessage } from "@/lib/appwrite/errors";
import { queryClient } from "@/lib/query-client";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";

// Oturum kontrolü bitene kadar splash ekranı açık kalsın (giriş ekranı bir an görünüp kaybolmasın).
void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { theme, colors } = useTheme();
  const session = useSession();

  useEffect(() => {
    if (!session.isPending) {
      void SplashScreen.hideAsync();
    }
  }, [session.isPending]);

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
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RootNavigator />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
