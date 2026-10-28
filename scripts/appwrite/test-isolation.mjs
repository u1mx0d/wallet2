/**
 * Veri izolasyonu testi.
 *
 * Çalıştırma:  npm run appwrite:test-isolation
 *
 * İki GEÇİCİ kullanıcı (A ve B) oluşturur, gerçek kullanıcı oturumlarıyla
 * istek atar ve şunları doğrular:
 *  - A kendi satırını okuyabilir; B okuyamaz, listeleyemez, güncelleyemez, silemez.
 *  - B, A adına izin vererek satır oluşturamaz.
 *  - Kullanıcılar trades ve price_cache tablolarına doğrudan yazamaz.
 *  - Kullanıcılar price_cache'i okuyabilir; oturumsuz (misafir) istek kullanıcı verisi göremez.
 * Sonunda oluşturduğu kullanıcıları ve satırları SİLER.
 */
import {
    Account,
    Client,
    ID,
    Permission,
    Query,
    Role,
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

const adminClient = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(TEST_KEY);
const adminUsers = new Users(adminClient);
const adminAccount = new Account(adminClient);
const adminTables = new TablesDB(adminClient);

/** Uygulamadaki src/lib/appwrite/permissions.ts ile aynı kural. */
function ownerPermissions(userId) {
  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];
}

const DENIED_CODES = new Set([400, 401, 403, 404]);
let passed = 0;
let failed = 0;

function pass(name, detail) {
  passed += 1;
  console.log(`  ✓ ${name}${detail ? ` (${detail})` : ""}`);
}

function fail(name, detail) {
  failed += 1;
  console.log(`  ✗ ${name} → ${detail}`);
}

async function expectAllowed(name, action) {
  try {
    const result = await action();
    pass(name);
    return result;
  } catch (error) {
    fail(
      name,
      `İzin verilmeliydi ama reddedildi: HTTP ${error?.code} ${error?.message}`,
    );
    return undefined;
  }
}

async function expectDenied(name, action, onUnexpectedSuccess) {
  try {
    const result = await action();
    if (onUnexpectedSuccess) onUnexpectedSuccess(result);
    fail(name, "İstek BAŞARILI oldu, reddedilmeliydi.");
  } catch (error) {
    if (DENIED_CODES.has(error?.code)) {
      pass(name, `HTTP ${error.code}`);
    } else {
      fail(name, `Beklenmeyen hata: HTTP ${error?.code} ${error?.message}`);
    }
  }
}

/** Liste isteği ya reddedilmeli ya da yasak satırı içermemeli. */
async function expectListHidesRow(name, action, forbiddenRowId) {
  try {
    const result = await action();
    const leaked = result.rows.some((row) => row.$id === forbiddenRowId);
    if (leaked) fail(name, "Başka kullanıcının satırı listede GÖRÜNDÜ.");
    else pass(name, `${result.total} satır döndü, sızıntı yok`);
  } catch (error) {
    if (DENIED_CODES.has(error?.code)) pass(name, `HTTP ${error.code}`);
    else fail(name, `Beklenmeyen hata: HTTP ${error?.code} ${error?.message}`);
  }
}

function sessionTables(secret) {
  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setSession(secret);
  return new TablesDB(client);
}

const createdUserIds = [];
const createdRows = []; // { tableId, rowId }

async function createTestUser(label, runId) {
  const email = `isolation-${label}-${runId}@example.com`;
  const password = `Test-${crypto.randomUUID()}`;
  const user = await adminUsers.create({
    userId: ID.unique(),
    email,
    password,
    name: `Izolasyon testi ${label.toUpperCase()}`,
  });
  createdUserIds.push(user.$id);
  const session = await adminAccount.createEmailPasswordSession({
    email,
    password,
  });
  return { id: user.$id, tables: sessionTables(session.secret) };
}

function sampleTransaction(userId) {
  return {
    userId,
    type: "expense",
    amountMinor: 1234,
    categoryId: "isolation-test",
    note: "izolasyon testi",
    date: new Date().toISOString(),
  };
}

async function cleanup() {
  console.log("\nTemizlik:");
  for (const { tableId, rowId } of createdRows) {
    try {
      await adminTables.deleteRow({ databaseId: DATABASE_ID, tableId, rowId });
      console.log(`  - Satır silindi: ${tableId}/${rowId}`);
    } catch (error) {
      if (error?.code !== 404)
        console.log(
          `  ! Satır silinemedi: ${tableId}/${rowId} (${error?.message})`,
        );
    }
  }
  for (const userId of createdUserIds) {
    try {
      await adminUsers.delete({ userId });
      console.log(`  - Test kullanıcısı silindi: ${userId}`);
    } catch (error) {
      console.log(
        `  ! Kullanıcı silinemedi: ${userId} (${error?.message}). Panelden elle sil.`,
      );
    }
  }
}

async function main() {
  const runId = Date.now().toString(36);
  console.log(`İzolasyon testi → ${ENDPOINT} / proje ${PROJECT_ID}\n`);

  const userA = await createTestUser("a", runId);
  const userB = await createTestUser("b", runId);
  console.log(`Test kullanıcıları oluşturuldu: A=${userA.id}, B=${userB.id}\n`);

  console.log("[transactions] Sahiplik:");
  const rowA = await expectAllowed("A kendi işlemini oluşturabilir", () =>
    userA.tables.createRow({
      databaseId: DATABASE_ID,
      tableId: "transactions",
      rowId: ID.unique(),
      data: sampleTransaction(userA.id),
      permissions: ownerPermissions(userA.id),
    }),
  );
  if (!rowA) {
    throw new Error(
      "A satır oluşturamadığı için diğer testler çalıştırılamıyor.",
    );
  }
  createdRows.push({ tableId: "transactions", rowId: rowA.$id });

  await expectAllowed("A kendi işlemini okuyabilir", () =>
    userA.tables.getRow({
      databaseId: DATABASE_ID,
      tableId: "transactions",
      rowId: rowA.$id,
    }),
  );

  console.log("\n[transactions] B, A'nın verisine erişmeye çalışıyor:");
  await expectDenied("B, A'nın satırını okuyamaz", () =>
    userB.tables.getRow({
      databaseId: DATABASE_ID,
      tableId: "transactions",
      rowId: rowA.$id,
    }),
  );
  await expectListHidesRow(
    "B, userId=A filtresiyle listelediğinde A'nın satırını göremez",
    () =>
      userB.tables.listRows({
        databaseId: DATABASE_ID,
        tableId: "transactions",
        queries: [Query.equal("userId", userA.id)],
      }),
    rowA.$id,
  );
  await expectListHidesRow(
    "B, filtresiz listelediğinde A'nın satırını göremez",
    () =>
      userB.tables.listRows({
        databaseId: DATABASE_ID,
        tableId: "transactions",
      }),
    rowA.$id,
  );
  await expectDenied("B, A'nın satırını güncelleyemez", () =>
    userB.tables.updateRow({
      databaseId: DATABASE_ID,
      tableId: "transactions",
      rowId: rowA.$id,
      data: { amountMinor: 1 },
    }),
  );
  await expectDenied("B, A'nın satırını silemez", () =>
    userB.tables.deleteRow({
      databaseId: DATABASE_ID,
      tableId: "transactions",
      rowId: rowA.$id,
    }),
  );
  await expectDenied(
    "B, A adına izin vererek satır oluşturamaz",
    () =>
      userB.tables.createRow({
        databaseId: DATABASE_ID,
        tableId: "transactions",
        rowId: ID.unique(),
        data: sampleTransaction(userA.id),
        permissions: ownerPermissions(userA.id),
      }),
    (row) => createdRows.push({ tableId: "transactions", rowId: row.$id }),
  );

  console.log("\n[trades] İstemci doğrudan yazamaz:");
  await expectDenied(
    "A, trades tablosuna doğrudan satır ekleyemez",
    () =>
      userA.tables.createRow({
        databaseId: DATABASE_ID,
        tableId: "trades",
        rowId: ID.unique(),
        data: {
          userId: userA.id,
          symbol: "THYAO",
          side: "buy",
          lots: 1,
          priceMinor: 10000,
          date: new Date().toISOString(),
        },
        permissions: ownerPermissions(userA.id),
      }),
    (row) => createdRows.push({ tableId: "trades", rowId: row.$id }),
  );

  console.log("\n[price_cache] Okuma serbest, yazma yasak:");
  await expectAllowed("A, price_cache'i okuyabilir", () =>
    userA.tables.listRows({ databaseId: DATABASE_ID, tableId: "price_cache" }),
  );
  await expectDenied(
    "A, price_cache'e yazamaz",
    () =>
      userA.tables.createRow({
        databaseId: DATABASE_ID,
        tableId: "price_cache",
        rowId: "ISOTEST",
        data: {
          symbol: "ISOTEST",
          priceMinor: 100,
          updatedAt: new Date().toISOString(),
          source: "isolation-test",
        },
      }),
    (row) => createdRows.push({ tableId: "price_cache", rowId: row.$id }),
  );

  console.log("\n[misafir] Oturumsuz istek:");
  const guestTables = new TablesDB(
    new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID),
  );
  await expectListHidesRow(
    "Oturumsuz istek A'nın işlemlerini göremez",
    () =>
      guestTables.listRows({
        databaseId: DATABASE_ID,
        tableId: "transactions",
      }),
    rowA.$id,
  );
  await expectDenied("Oturumsuz istek price_cache'i okuyamaz", async () => {
    const result = await guestTables.listRows({
      databaseId: DATABASE_ID,
      tableId: "price_cache",
    });
    // Tablo seviyesinde yalnızca users okuyabildiği için misafir isteği reddedilmeli.
    // Boş liste dönerse bunu da "erişim yok" sayıyoruz.
    if (result.total === 0 && result.rows.length === 0) {
      const error = new Error("Boş liste (erişim yok)");
      error.code = 401;
      throw error;
    }
    return result;
  });
}

main()
  .catch((error) => {
    console.error(`\n✗ Test yarıda kesildi: ${error?.message ?? error}`);
    if (error?.code) console.error(`  HTTP kodu: ${error.code}`);
    failed += 1;
  })
  .finally(async () => {
    await cleanup();
    console.log(`\nSonuç: ${passed} geçti, ${failed} başarısız.`);
    if (failed > 0) {
      console.log(
        "✗ İZOLASYON TESTİ BAŞARISIZ. Sonraki adıma GEÇME; çıktıyı paylaş.",
      );
      process.exitCode = 1;
    } else {
      console.log("✓ İzolasyon testi geçti.");
    }
  });
