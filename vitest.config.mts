import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // tsconfig.json'daki "@/*" → "./src/*" eşlemesinin aynısı.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // Saf modüllerin testleri: uygulama (TS) ve Appwrite Function'ları (JS).
    // React Native bileşen testi yok.
    include: ["src/**/*.test.ts", "functions/**/src/**/*.test.js"],
    environment: "node",
  },
});
