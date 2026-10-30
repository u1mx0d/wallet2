/**
 * price_cache'e TEST fiyatı yazar (piyasa kapalıyken arayüzü denemek için).
 *
 * Kullanım:
 *   npm run prices:set -- THYAO 312,50
 *   npm run prices:set -- THYAO 312,50 305,00     (önceki kapanış ile)
 *
 * Kaynak "test-verisi" olarak işaretlenir. Sembol portföydeyse bir sonraki zamanlanmış
 * çalıştırmada sağlayıcının gerçek fiyatı bunun üzerine yazılır.
 * APPWRITE_SETUP_KEY kullanır (.env.setup).
 */
import { Client, TablesDB } from "node-appwrite";

const SYMBOL_PATTERN = /^[A-Z0-9]{2,12}$/;
const PRICE_PATTERN = /^(\d{1,10})(?:,(\d{1,2}))?$/;

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(
      `✗ Eksik ortam değişkeni: ${name} (.env.setup dosyasını kontrol et)`,
    );
    process.exit(1);
  }
  return value;
}

/** "312,50" → 31250. Nokta binlik ayırıcı olarak kabul edilmez; yalnızca virgül ondalık. */
function parsePrice(text) {
  const match = PRICE_PATTERN.exec(text ?? "");
  if (!match) return null;
  const lira = Number(match[1]);
  const kurus = Number((match[2] ?? "").padEnd(2, "0"));
  const minor = lira * 100 + kurus;
  return minor >= 1 ? minor : null;
}

const [rawSymbol, rawPrice, rawPrevClose] = process.argv.slice(2);
const symbol = (rawSymbol ?? "").trim().toUpperCase();
const priceMinor = parsePrice(rawPrice);
const prevCloseMinor =
  rawPrevClose === undefined ? null : parsePrice(rawPrevClose);

if (
  !SYMBOL_PATTERN.test(symbol) ||
  priceMinor === null ||
  (rawPrevClose !== undefined && prevCloseMinor === null)
) {
  console.error(
    "Kullanım: npm run prices:set -- SEMBOL FİYAT [ÖNCEKİ_KAPANIŞ]   (ör. THYAO 312,50 305,00)",
  );
  process.exit(1);
}

const client = new Client()
  .setEndpoint(requireEnv("APPWRITE_ENDPOINT"))
  .setProject(requireEnv("APPWRITE_PROJECT_ID"))
  .setKey(requireEnv("APPWRITE_SETUP_KEY"));
const tablesDB = new TablesDB(client);
const DATABASE_ID = requireEnv("APPWRITE_DATABASE_ID");

const data = {
  symbol,
  priceMinor,
  prevCloseMinor,
  updatedAt: new Date().toISOString(),
  source: "test-verisi",
  stale: false,
};
const params = {
  databaseId: DATABASE_ID,
  tableId: "price_cache",
  rowId: symbol,
  data,
};

try {
  try {
    await tablesDB.updateRow(params);
  } catch (error) {
    if (error?.code !== 404) throw error;
    await tablesDB.createRow({ ...params, data: { ...data, name: symbol } });
  }
  console.log(`✓ ${symbol}: ${rawPrice} TL (test verisi) yazıldı.`);
} catch (error) {
  console.error(`✗ Yazılamadı: ${error?.message ?? error}`);
  process.exitCode = 1;
}
