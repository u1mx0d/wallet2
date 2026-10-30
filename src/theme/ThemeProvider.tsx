import AsyncStorage from "@react-native-async-storage/async-storage";
import { vars } from "nativewind";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme, View } from "react-native";

import {
  getThemeColors,
  palettes,
  toCssVariables,
  type ColorToken,
  type ThemeName,
} from "./tokens";

export type ThemePreference = "system" | "light" | "dark";

const PREFERENCE_STORAGE_KEY = "wallet.themePreference";

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

type ThemeContextValue = {
  /** Uygulanan tema. */
  theme: ThemeName;
  colors: Record<ColorToken, string>;
  /** Kullanıcının seçimi; "system" telefonun temasını izler. */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Temayı belirler (kullanıcı tercihi veya telefonun teması) ve CSS değişkenlerini kök View'a uygular.
 * Tercih telefonda saklanır (gizli olmayan bir arayüz ayarı).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    AsyncStorage.getItem(PREFERENCE_STORAGE_KEY)
      .then((stored) => {
        if (isThemePreference(stored)) setPreferenceState(stored);
      })
      .catch(() => {
        // Okunamazsa sistem teması kullanılır.
      });
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(PREFERENCE_STORAGE_KEY, next).catch(() => {
      // Kaydedilemezse yalnızca bu oturumda geçerli olur.
    });
  }, []);

  const theme: ThemeName =
    preference === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : preference;

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, colors: getThemeColors(theme), preference, setPreference }),
    [theme, preference, setPreference],
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

/** Aktif tema, düz renk değerleri ve tema tercihi. */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme, ThemeProvider içinde kullanılmalı.");
  }
  return context;
}
