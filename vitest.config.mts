import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // tsconfig.json'daki "@/*" → "./src/*" eşlemesinin aynısı.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // Yalnızca saf TypeScript modüllerinin testleri. React Native bileşen testi yok.
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
