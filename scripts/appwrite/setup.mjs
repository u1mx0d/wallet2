/**
 * Appwrite şema kurulumu: tablolar, kolonlar, indeksler ve izinler.
 *
 * Çalıştırma:  npm run appwrite:setup
 *
 * İDEMPOTENT: Defalarca çalıştırılabilir. Var olanı yeniden oluşturmaz;
 * eksikleri ekler, tablo izinlerini bu dosyadaki tanımla eşitler.
 * Var olan bir kolonun tipini/boyutunu DEĞİŞTİRMEZ (veri kaybı riski);
 * farklılık görürse uyarı verir.
 *
 * Tablo ID'leri src/lib/appwrite/schema.ts ile BİREBİR aynı olmalı.
 */
import { Client, Permission, Role, TablesDB } from "node-appwrite";

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

const ENDPOINT = requireEnv("APPWRITE_ENDPOINT");
const PROJECT_ID = requireEnv("APPWRITE_PROJECT_ID");
const DATABASE_ID = requireEnv("APPWRITE_DATABASE_ID");
const SETUP_KEY = requireEnv("APPWRITE_SETUP_KEY");

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(SETUP_KEY);
const tablesDB = new TablesDB(client);

// Kuruş cinsinden üst sınır (≈ 10 milyar TL). Number.MAX_SAFE_INTEGER'ın çok altında.
const MAX_MINOR = 999_999_999_999;
const MAX_LOTS = 1_000_000_000;

/** @typedef {{ kind: "varchar", key: string, size: number, required: boolean, default?: string }
 *   | { kind: "enum", key: string, elements: string[], required: boolean, default?: string }
 *   | { kind: "integer", key: string, required: boolean, min: number, max: number, default?: number }
 *   | { kind: "datetime", key: string, required: boolean }
 *   | { kind: "boolean", key: string, required: boolean, default?: boolean }} ColumnDef */

const TABLES = [
  {
    id: "categories",
    name: "Categories",
    // Giriş yapmış kullanıcılar satır OLUŞTURABİLİR; okuma/güncelleme/silme satır izniyle.
    permissions: [Permission.create(Role.users())],
    rowSecurity: true,
    /** @type {ColumnDef[]} */
    columns: [
      { kind: "varchar", key: "userId", size: 36, required: true },
      { kind: "varchar", key: "name", size: 50, required: true },
      {
        kind: "enum",
        key: "type",
        elements: ["income", "expense"],
        required: true,
      },
      { kind: "varchar", key: "icon", size: 32, required: true },
      { kind: "varchar", key: "color", size: 7, required: true },
    ],
    indexes: [
      {
        key: "userId_type",
        type: "key",
        columns: ["userId", "type"],
        orders: ["ASC", "ASC"],
      },
    ],
  },
  {
    id: "transactions",
    name: "Transactions",
    permissions: [Permission.create(Role.users())],
    rowSecurity: true,
    columns: [
      { kind: "varchar", key: "userId", size: 36, required: true },
      {
        kind: "enum",
        key: "type",
        elements: ["income", "expense"],
        required: true,
      },
      {
        kind: "integer",
        key: "amountMinor",
        required: true,
        min: 1,
        max: MAX_MINOR,
      },
      { kind: "varchar", key: "categoryId", size: 36, required: true },
      { kind: "varchar", key: "note", size: 500, required: false },
      { kind: "datetime", key: "date", required: true },
    ],
    indexes: [
      {
        key: "userId_date",
        type: "key",
        columns: ["userId", "date"],
        orders: ["ASC", "DESC"],
      },
      {
        key: "userId_category_date",
        type: "key",
        columns: ["userId", "categoryId", "date"],
        orders: ["ASC", "ASC", "DESC"],
      },
    ],
  },
  {
    id: "trades",
    name: "Trades",
    // Tablo seviyesinde HİÇ izin yok: istemci doğrudan yazamaz.
    // Kayıtlar, lot kontrolü yapan bir Function üzerinden yazılacak (ADIM 9).
    permissions: [],
    rowSecurity: true,
    columns: [
      { kind: "varchar", key: "userId", size: 36, required: true },
      { kind: "varchar", key: "symbol", size: 12, required: true },
      { kind: "enum", key: "side", elements: ["buy", "sell"], required: true },
      { kind: "integer", key: "lots", required: true, min: 1, max: MAX_LOTS },
      {
        kind: "integer",
        key: "priceMinor",
        required: true,
        min: 1,
        max: MAX_MINOR,
      },
      {
        kind: "integer",
        key: "feeMinor",
        required: false,
        min: 0,
        max: MAX_MINOR,
        default: 0,
      },
      { kind: "datetime", key: "date", required: true },
    ],
    indexes: [
      {
        key: "userId_symbol_date",
        type: "key",
        columns: ["userId", "symbol", "date"],
        orders: ["ASC", "ASC", "ASC"],
      },
      {
        key: "userId_date",
        type: "key",
        columns: ["userId", "date"],
        orders: ["ASC", "DESC"],
      },
      { key: "symbol", type: "key", columns: ["symbol"], orders: ["ASC"] },
    ],
  },
  {
    id: "price_cache",
    name: "Price cache",
    // Giriş yapmış herkes OKUYABİLİR. Yazma yalnızca API key'li Function'dan.
    permissions: [Permission.read(Role.users())],
    rowSecurity: false,
    columns: [
      { kind: "varchar", key: "symbol", size: 12, required: true },
      // Şirket adı (sembol arama ekranı için). Sağlayıcıdan gelir; isteğe bağlı.
      { kind: "varchar", key: "name", size: 100, required: false },
      {
        kind: "integer",
        key: "priceMinor",
        required: true,
        min: 1,
        max: MAX_MINOR,
      },
      {
        kind: "integer",
        key: "prevCloseMinor",
        required: false,
        min: 1,
        max: MAX_MINOR,
      },
      { kind: "datetime", key: "updatedAt", required: true },
      { kind: "varchar", key: "source", size: 50, required: true },
      { kind: "boolean", key: "stale", required: false, default: false },
    ],
    indexes: [
      {
        key: "symbol_unique",
        type: "unique",
        columns: ["symbol"],
        orders: ["ASC"],
      },
    ],
  },
];

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 120_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isNotFound(error) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 404
  );
}

async function ensureTable(table) {
  const base = {
    databaseId: DATABASE_ID,
    tableId: table.id,
    name: table.name,
    permissions: table.permissions,
    rowSecurity: table.rowSecurity,
  };

  try {
    await tablesDB.getTable({ databaseId: DATABASE_ID, tableId: table.id });
  } catch (error) {
    if (!isNotFound(error)) throw error;
    await tablesDB.createTable(base);
    console.log(`  + Tablo oluşturuldu: ${table.id}`);
    return;
  }

  // Var olan tablonun izinlerini ve row security ayarını bu dosyayla eşitle.
  await tablesDB.updateTable(base);
  console.log(`  = Tablo zaten var, izinler eşitlendi: ${table.id}`);
}

async function createColumn(tableId, column) {
  const common = {
    databaseId: DATABASE_ID,
    tableId,
    key: column.key,
    required: column.required,
  };
  const withDefault =
    column.required || column.default === undefined
      ? {}
      : { xdefault: column.default };

  switch (column.kind) {
    case "varchar":
      return tablesDB.createVarcharColumn({
        ...common,
        size: column.size,
        ...withDefault,
      });
    case "enum":
      return tablesDB.createEnumColumn({
        ...common,
        elements: column.elements,
        ...withDefault,
      });
    case "integer":
      return tablesDB.createIntegerColumn({
        ...common,
        min: column.min,
        max: column.max,
        ...withDefault,
      });
    case "datetime":
      return tablesDB.createDatetimeColumn(common);
    case "boolean":
      return tablesDB.createBooleanColumn({ ...common, ...withDefault });
    default:
      throw new Error(`Bilinmeyen kolon türü: ${column.kind}`);
  }
}

async function ensureColumns(table) {
  const { columns: existing } = await tablesDB.listColumns({
    databaseId: DATABASE_ID,
    tableId: table.id,
  });
  const existingByKey = new Map(existing.map((column) => [column.key, column]));

  for (const column of table.columns) {
    const current = existingByKey.get(column.key);
    if (current) {
      if (current.required !== column.required) {
        console.warn(
          `  ! ${table.id}.${column.key} zaten var ama "required" farklı ` +
            `(panelde: ${current.required}, tanımda: ${column.required}). Elle kontrol et.`,
        );
      }
      continue;
    }
    await createColumn(table.id, column);
    console.log(`  + Kolon: ${table.id}.${column.key}`);
  }

  await waitUntilAvailable(table.id, "kolon", async () => {
    const { columns } = await tablesDB.listColumns({
      databaseId: DATABASE_ID,
      tableId: table.id,
    });
    return columns.filter((column) =>
      table.columns.some((def) => def.key === column.key),
    );
  });
}

async function ensureIndexes(table) {
  const { indexes: existing } = await tablesDB.listIndexes({
    databaseId: DATABASE_ID,
    tableId: table.id,
  });
  const existingKeys = new Set(existing.map((index) => index.key));

  for (const index of table.indexes) {
    if (existingKeys.has(index.key)) continue;
    await tablesDB.createIndex({
      databaseId: DATABASE_ID,
      tableId: table.id,
      key: index.key,
      type: index.type,
      columns: index.columns,
      orders: index.orders,
    });
    console.log(`  + İndeks: ${table.id}.${index.key}`);
  }

  await waitUntilAvailable(table.id, "indeks", async () => {
    const { indexes } = await tablesDB.listIndexes({
      databaseId: DATABASE_ID,
      tableId: table.id,
    });
    return indexes.filter((index) =>
      table.indexes.some((def) => def.key === index.key),
    );
  });
}

/** Appwrite kolon ve indeksleri arka planda hazırlar; "available" olana kadar bekler. */
async function waitUntilAvailable(tableId, label, fetchItems) {
  const startedAt = Date.now();
  for (;;) {
    const items = await fetchItems();
    const failed = items.filter((item) => item.status === "failed");
    if (failed.length > 0) {
      const details = failed
        .map((item) => `${item.key}: ${item.error ?? "neden belirtilmemiş"}`)
        .join(", ");
      throw new Error(
        `${tableId} tablosunda ${label} oluşturulamadı → ${details}`,
      );
    }
    const pending = items.filter((item) => item.status !== "available");
    if (pending.length === 0) return;
    if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
      throw new Error(
        `${tableId}: ${label} hazırlanması zaman aşımına uğradı (${pending.map((i) => i.key).join(", ")}).`,
      );
    }
    await sleep(POLL_INTERVAL_MS);
  }
}

async function main() {
  console.log(
    `Appwrite şema kurulumu → ${ENDPOINT} / proje ${PROJECT_ID} / database ${DATABASE_ID}\n`,
  );

  for (const table of TABLES) {
    console.log(`[${table.id}]`);
    await ensureTable(table);
    await ensureColumns(table);
    await ensureIndexes(table);
    console.log(`  ✓ Hazır\n`);
  }

  console.log("✓ Kurulum tamamlandı.");
}

main().catch((error) => {
  console.error("\n✗ Kurulum başarısız.");
  console.error(`  Mesaj: ${error?.message ?? error}`);
  if (error?.code) console.error(`  HTTP kodu: ${error.code}`);
  if (error?.type) console.error(`  Tür: ${error.type}`);
  process.exitCode = 1;
});
