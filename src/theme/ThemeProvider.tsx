import { vars } from "nativewind";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useColorScheme, View } from "react-native";

import {
    getThemeColors,
    palettes,
    toCssVariables,
    type ColorToken,
    type ThemeName,
} from "./tokens";

type ThemeContextValue = {
  theme: ThemeName;
  colors: Record<ColorToken, string>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Telefonun sistem temasını okuyup CSS değişkenlerini kök View'a uygular.
 * Altındaki tüm bileşenler bg-surface, text-income gibi sınıfları kullanabilir.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const theme: ThemeName = systemScheme === "dark" ? "dark" : "light";

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, colors: getThemeColors(theme) }),
    [theme],
  );

  const cssVariables = useMemo(
    () => vars(toCssVariables(palettes[theme])),
    [theme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View
        style={[
          { flex: 1, backgroundColor: value.colors.background },
          cssVariables,
        ]}
      >
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

/** Aktif temayı ve düz renk değerlerini verir (grafikler, navigation vb. için). */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme, ThemeProvider içinde kullanılmalı.");
  }
  return context;
}
