import { Stack } from "expo-router";

import { UndoDeleteProvider } from "@/features/transactions/undo/UndoDeleteProvider";
import { useTheme } from "@/theme/ThemeProvider";

// Bu stack'e doğrudan bir alt ekranla girilirse altında sekmeler olsun.
export const unstable_settings = {
  anchor: "(tabs)",
};

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
