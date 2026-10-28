/**
 * Renk token adları src/theme/tokens.ts içindeki colorTokenNames ile
 * BİREBİR aynı olmalı. Bir token eklerken iki dosyayı da güncelle.
 */
const colorTokenNames = [
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
];

const semanticColors = Object.fromEntries(
  colorTokenNames.map((name) => [
    name,
    `rgb(var(--color-${name}) / <alpha-value>)`,
  ]),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    // `extend` yerine doğrudan `colors`: Tailwind'in hazır paletini kapatıyoruz,
    // böylece yalnızca semantik token'lar kullanılabilir.
    colors: {
      transparent: "transparent",
      current: "currentColor",
      white: "#ffffff",
      black: "#000000",
      ...semanticColors,
    },
    extend: {},
  },
  plugins: [],
};
