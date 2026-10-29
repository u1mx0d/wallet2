import { Stack } from "expo-router";

import { UndoDeleteProvider } from "@/features/transactions/undo/UndoDeleteProvider";
import { useTheme } from "@/theme/ThemeProvider";

export default function AppLayout() {
  const { colors } = useTheme();
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
