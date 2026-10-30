/**
 * Hesap motorunu (src/domain/portfolio.ts ve bağımlılıkları) Function'ların kullanabileceği
 * tek bir ESM JavaScript dosyasına derler.
 *
 * Çalıştırma:  npm run functions:build
 * src/domain altındaki motoru değiştirdikten sonra çalıştır, ardından `appwrite push functions`.
 */
import { build } from "esbuild";

const banner = [
  "// ⚠️ OTOMATİK ÜRETİLDİ — ELLE DÜZENLEME.",
  "// Kaynak: src/domain/portfolio.ts (ve import ettiği domain dosyaları).",
  "// Yeniden üretmek için: npm run functions:build",
  "",
].join("\n");

await build({
  entryPoints: ["src/domain/portfolio.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  outfile: "functions/user-tasks/src/vendor/portfolio.js",
  banner: { js: banner },
  logLevel: "info",
});
