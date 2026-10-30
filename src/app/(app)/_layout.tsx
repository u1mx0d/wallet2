import { Stack } from "expo-router";

import { useSession } from "@/features/auth/hooks";
import { UndoDeleteProvider } from "@/features/transactions/undo/UndoDeleteProvider";
import { useTheme } from "@/theme/ThemeProvider";

// Bu stack'e doğrudan bir alt ekranla girilirse altında sekmeler olsun.
export const unstable_settings = {
  anchor: "(tabs)",
};

export default function AppLayout() {
  const { colors } = useTheme();
  const session = useSession();

  // Çıkış veya hesap silme anında oturum null olur. Kök layout'taki yönlendirme tamamlanana kadar
  // bu grubun hiçbir ekranı (arka planda bağlı sekmeler dahil) oturumsuz halde çizilmemeli:
  // useCurrentUserId'yi kullanan ekranlar aksi halde hata fırlatır. Layout null döndürünce
  // içindeki her şey aynı turda kaldırılır.
  if (!session.data) return null;

  return (
    <UndoDeleteProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerTitleStyle: { color: colors.foreground },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
        }}
      />
    </UndoDeleteProvider>
  );
}
