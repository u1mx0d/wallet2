/**
 * Tasarım token'larının tek kaynağı.
 * - Tailwind sınıfları (bg-surface, text-income...) bu değerleri CSS değişkenleri üzerinden okur.
 * - Grafikler gibi className anlamayan kütüphaneler getThemeColors() ile aynı değerleri alır.
 *
 * Değerler "R G B" formatında (virgülsüz), çünkü Tailwind'in opaklık sözdizimi
 * (ör. bg-primary/20) bu formatı gerektirir.
 */

export type ThemeName = "light" | "dark";

/** tailwind.config.js içindeki liste ile BİREBİR aynı olmalı. */
export const colorTokenNames = [
  "background",
  "surface",
  "surface-muted",
  "border",
  "foreground",
  "muted",
  "primary",
  "on-primary",
  "income",
  "expense",
  "warning",
] as const;

export type ColorToken = (typeof colorTokenNames)[number];

type RgbTriplet = `${number} ${number} ${number}`;

type Palette = Record<ColorToken, RgbTriplet>;

export const palettes: Record<ThemeName, Palette> = {
  light: {
    background: "248 250 252",
    surface: "255 255 255",
    "surface-muted": "241 245 249",
    border: "226 232 240",
    foreground: "15 23 42",
    muted: "100 116 139",
    primary: "37 99 235",
    "on-primary": "255 255 255",
    income: "21 128 61",
    expense: "220 38 38",
    warning: "180 83 9",
  },
  dark: {
    background: "9 9 11",
    surface: "24 24 27",
    "surface-muted": "39 39 42",
    border: "52 52 56",
    foreground: "244 244 245",
    muted: "161 161 170",
    primary: "96 165 250",
    "on-primary": "9 9 11",
    income: "74 222 128",
    expense: "248 113 113",
    warning: "251 191 36",
  },
};

/** "R G B" değerini React Native'in anladığı "rgba(R, G, B, A)" formatına çevirir. */
export function toRgba(triplet: RgbTriplet, alpha = 1): string {
  const [r, g, b] = triplet.split(" ");
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** NativeWind vars() için CSS değişkeni nesnesi üretir. */
export function toCssVariables(palette: Palette): Record<string, string> {
  const result: Record<string, string> = {};
  for (const name of colorTokenNames) {
    result[`--color-${name}`] = palette[name];
  }
  return result;
}

/** Grafikler ve navigation gibi className kullanamayan yerler için düz renk değerleri. */
export function getThemeColors(theme: ThemeName): Record<ColorToken, string> {
  const palette = palettes[theme];
  const result = {} as Record<ColorToken, string>;
  for (const name of colorTokenNames) {
    result[name] = toRgba(palette[name]);
  }
  return result;
}
