import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Yalnızca saf TypeScript modüllerinin testleri. React Native bileşen testi yok.
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
