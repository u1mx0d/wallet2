/**
 * Alım/satım sunucu kuralları testi (user-tasks → /trades).
 *
 * Çalıştırma:  npm run appwrite:test-trades
 *
 * İki geçici kullanıcı oluşturur, gerçek kullanıcı oturumlarıyla Function'ı çağırır ve kuralları
 * doğrular. Sonunda kullanıcıları ve oluşturduğu tüm satırları (işlemler, kategoriler) SİLER.
 * Gereken: price_cache'te THYAO satırı (price-sync'in en az bir kez çalışmış olması).
 * APPWRITE_TEST_KEY scope'ları: users.read, users.write, sessions.write, rows.read, rows.write.
 */
import {
  Account,
  Client,
  Functions,
  ID,
  Query,
  TablesDB,
  Users,
} from "node-appwrite";

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
const TEST_KEY = requireEnv("APPWRITE_TEST_KEY");

const FUNCTION_ID = "user-tasks";
const TRADES_PATH = "/trades";
const SYMBOL = "THYAO";

const adminClient = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(TEST_KEY);
const adminUsers = new Users(adminClient);
const adminAccount = new Account(adminClient);
const adminTables = new TablesDB(adminClient);

let passed = 0;
let failed = 0;
let cleanupProblems = 0;
const createdUserIds = [];

const day = (n) => new Date(Date.UTC(2026, 8, n, 9)).toISOString();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name} → ${detail}`);
  }
}

async function createTestUser(label, runId) {
  const email = `trades-${label}-${runId}@example.com`;
  const password = `Test-${crypto.randomUUID()}`;
  const user = await adminUsers.create({
    userId: ID.unique(),
    email,
    password,
    name: `İşlem testi ${label}`,
  });
  createdUserIds.push(user.$id);
  const session = await adminAccount.createEmailPasswordSession({
    email,
    password,
  });
  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setSession(session.secret);
  return {
    id: user.$id,
    functions: new Functions(client),
    tables: new TablesDB(client),
  };
}

async function callTrades(user, payload) {
  const execution = await user.functions.createExecution({
    functionId: FUNCTION_ID,
    xpath: TRADES_PATH,
    body: JSON.stringify(payload),
    async: false,
  });
  let body = {};
  try {
    body = JSON.parse(execution.responseBody || "{}");
  } catch {
    body = {};
  }
  return { status: execution.responseStatusCode, body };
}

function buy(lots, n) {
  return {
    symbol: SYMBOL,
    side: "buy",
    lots,
    priceMinor: 10_000,
    feeMinor: 0,
    date: day(n),
  };
}

function sell(lots, n) {
  return {
    symbol: SYMBOL,
    side: "sell",
    lots,
    priceMinor: 12_000,
    feeMinor: 0,
    date: day(n),
  };
}

/** Kullanıcının bir tablodaki tüm satırlarını siler. Hata olursa raporlar, fırlatmaz. */
async function deleteRowsOf(tableId, userId) {
  try {
    for (;;) {
      const result = await adminTables.listRows({
        databaseId: DATABASE_ID,
        tableId,
        queries: [Query.equal("userId", userId), Query.limit(100)],
      });
      if (result.rows.length === 0) return;
      for (const row of result.rows) {
        await adminTables.deleteRow({
          databaseId: DATABASE_ID,
          tableId,
          rowId: row.$id,
        });
      }
    }
  } catch (error) {
    cleanupProblems += 1;
    console.log(
      `  ! ${tableId} satırları silinemedi (${userId}): ${error?.message ?? error}`,
    );
  }
}

async function cleanup() {
  console.log(
    "\nTemizlik (varsayılan kategori event'inin bitmesi için 5 sn bekleniyor):",
  );
  await sleep(5_000);
  for (const userId of createdUserIds) {
    for (const tableId of ["trades", "categories", "transactions"])
      await deleteRowsOf(tableId, userId);
    try {
      await adminUsers.delete({ userId });
      console.log(`  - Kullanıcı silindi: ${userId}`);
    } catch (error) {
      cleanupProblems += 1;
      console.log(
        `  ! Kullanıcı silinemedi (${userId}): ${error?.message ?? error}`,
      );
    }
  }
}

async function main() {
  const runId = Date.now().toString(36);
  const a = await createTestUser("a", runId);
  const b = await createTestUser("b", runId);
  console.log(`Test kullanıcıları: A=${a.id}, B=${b.id}\n`);

  const buyId = ID.unique();
  const sellId = ID.unique();

  console.log("[ekleme]");
  let response = await callTrades(a, {
    action: "create",
    id: buyId,
    trade: buy(10, 1),
  });
  check(
    "10 lot alım kaydedilir",
    response.status === 200 && response.body.created === true,
    JSON.stringify(response),
  );

  response = await callTrades(a, {
    action: "create",
    id: buyId,
    trade: buy(10, 1),
  });
  check(
    "aynı ID ile tekrar gönderilen alım ikinci kayıt oluşturmaz",
    response.status === 200 && response.body.created === false,
    JSON.stringify(response),
  );

  response = await callTrades(a, {
    action: "create",
    id: ID.unique(),
    trade: sell(11, 2),
  });
  check(
    "eldekinden fazla (11 lot) satış reddedilir",
    response.status === 422 && response.body.error === "oversell",
    JSON.stringify(response),
  );
  console.log(`    sunucu mesajı: "${response.body.message}"`);

  response = await callTrades(a, {
    action: "create",
    id: sellId,
    trade: sell(5, 2),
  });
  check(
    "5 lot satış kaydedilir",
    response.status === 200,
    JSON.stringify(response),
  );

  response = await callTrades(a, {
    action: "create",
    id: ID.unique(),
    trade: { ...buy(1, 3), symbol: "ZZZZZZ" },
  });
  check(
    "bilinmeyen sembol reddedilir",
    response.status === 422 && response.body.error === "unknown_symbol",
    JSON.stringify(response),
  );

  response = await callTrades(a, {
    action: "create",
    id: ID.unique(),
    trade: { ...buy(1, 3), lots: 1.5 },
  });
  check(
    "kesirli lot reddedilir",
    response.status === 400 && response.body.error === "invalid_lots",
    JSON.stringify(response),
  );

  console.log("\n[düzenleme ve silme]");
  response = await callTrades(a, {
    action: "update",
    id: buyId,
    trade: buy(4, 1),
  });
  check(
    "alımı 4 lota düşürmek reddedilir (sonraki 5 lot satışı dayanaksız kalır)",
    response.status === 422 && response.body.error === "oversell",
    JSON.stringify(response),
  );

  response = await callTrades(a, {
    action: "update",
    id: buyId,
    trade: buy(20, 1),
  });
  check(
    "alımı 20 lota çıkarmak kabul edilir",
    response.status === 200,
    JSON.stringify(response),
  );

  response = await callTrades(a, { action: "delete", id: buyId });
  check(
    "satışın dayandığı alımı silmek reddedilir",
    response.status === 422 && response.body.error === "oversell",
    JSON.stringify(response),
  );

  const ownRows = await a.tables.listRows({
    databaseId: DATABASE_ID,
    tableId: "trades",
    queries: [Query.equal("userId", a.id)],
  });
  check(
    "A kendi 2 işlemini okuyabilir",
    ownRows.total === 2,
    `total=${ownRows.total}`,
  );

  console.log("\n[izolasyon]");
  response = await callTrades(b, {
    action: "update",
    id: buyId,
    trade: buy(1, 1),
  });
  check(
    "B, A'nın işlemini düzenleyemez",
    response.status === 404,
    JSON.stringify(response),
  );

  response = await callTrades(b, { action: "delete", id: buyId });
  check(
    "B, A'nın işlemini silemez",
    response.status === 404,
    JSON.stringify(response),
  );

  const leaked = await b.tables.listRows({
    databaseId: DATABASE_ID,
    tableId: "trades",
    queries: [Query.equal("userId", a.id)],
  });
  check(
    "B, A'nın işlemlerini listeleyemez",
    leaked.total === 0,
    `total=${leaked.total}`,
  );

  let directWriteBlocked = false;
  try {
    await a.tables.updateRow({
      databaseId: DATABASE_ID,
      tableId: "trades",
      rowId: buyId,
      data: { lots: 999 },
    });
  } catch {
    directWriteBlocked = true;
  }
  check(
    "A bile kendi işlemini Function'ı atlayarak doğrudan değiştiremez",
    directWriteBlocked,
    "güncelleme kabul edildi",
  );

  console.log("\n[sıralı silme]");
  response = await callTrades(a, { action: "delete", id: sellId });
  check(
    "önce satış silinir",
    response.status === 200,
    JSON.stringify(response),
  );
  response = await callTrades(a, { action: "delete", id: buyId });
  check(
    "sonra alım silinir",
    response.status === 200,
    JSON.stringify(response),
  );
}

main()
  .catch((error) => {
    console.error(`\n✗ Test yarıda kesildi: ${error?.message ?? error}`);
    failed += 1;
  })
  .finally(async () => {
    await cleanup();
    console.log(`\nSonuç: ${passed} geçti, ${failed} başarısız.`);
    if (cleanupProblems > 0) {
      console.log(
        `! Temizlikte ${cleanupProblems} sorun oluştu. Console > Auth > Users'tan "trades-" ile başlayan ` +
          "kullanıcıları sil, ardından: npm run appwrite:cleanup-orphans -- --apply",
      );
    }
    if (failed > 0) {
      console.log("✗ İŞLEM KURALLARI TESTİ BAŞARISIZ. Çıktıyı paylaş.");
      process.exitCode = 1;
    } else if (cleanupProblems > 0) {
      console.log("✓ Kurallar doğru, ama temizlik tamamlanamadı.");
      process.exitCode = 1;
    } else {
      console.log("✓ İşlem kuralları testi geçti.");
    }
  });
