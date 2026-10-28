import { Stack } from "expo-router";

import { useTheme } from "@/theme/ThemeProvider";

// SDK 58: anchor, bu stack'e doğrudan bir alt ekranla girilirse altına eklenen "geri" hedefidir.
// İlk açılış ekranını SEÇMEZ; onu kök layout'taki redirectTo belirler.
export const unstable_settings = {
  anchor: "sign-in",
};

export default function AuthLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
