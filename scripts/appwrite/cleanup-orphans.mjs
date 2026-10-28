/**
 * Sahipsiz satır temizliği: userId'si artık var olmayan kullanıcılara ait satırlar.
 *
 * Çalıştırma:
 *   npm run appwrite:cleanup-orphans              → yalnızca RAPOR (hiçbir şey silmez)
 *   npm run appwrite:cleanup-orphans -- --apply   → raporlananları SİLER
 *
 * APPWRITE_TEST_KEY kullanır (users.read, rows.read, rows.write).
 */
import { Client, Query, TablesDB, Users } from "node-appwrite";

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

const APPLY = process.argv.includes("--apply");
const USER_TABLE_IDS = ["categories", "transactions", "trades"];
const PAGE_SIZE = 100;

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(TEST_KEY);
const tablesDB = new TablesDB(client);
const users = new Users(client);

const userExistsCache = new Map();

async function userExists(userId) {
  if (userExistsCache.has(userId)) return userExistsCache.get(userId);
  try {
    await users.get({ userId });
    userExistsCache.set(userId, true);
    return true;
  } catch (error) {
    if (error?.code === 404) {
      userExistsCache.set(userId, false);
      return false;
    }
    throw error;
  }
}

async function listAllRows(tableId) {
  const rows = [];
  let cursor;
  for (;;) {
    const queries = [Query.limit(PAGE_SIZE)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const page = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId,
      queries,
    });
    rows.push(...page.rows);
    if (page.rows.length < PAGE_SIZE) return rows;
    cursor = page.rows[page.rows.length - 1].$id;
  }
}

async function main() {
  console.log(
    `Sahipsiz satır taraması (${APPLY ? "SİLME MODU" : "yalnızca rapor"})\n`,
  );
  let total = 0;

  for (const tableId of USER_TABLE_IDS) {
    const rows = await listAllRows(tableId);
    const orphans = [];
    for (const row of rows) {
      if (!(await userExists(row.userId))) orphans.push(row);
    }

    console.log(
      `[${tableId}] ${rows.length} satır tarandı, ${orphans.length} sahipsiz.`,
    );
    total += orphans.length;

    if (APPLY) {
      for (const row of orphans) {
        try {
          await tablesDB.deleteRow({
            databaseId: DATABASE_ID,
            tableId,
            rowId: row.$id,
          });
        } catch (error) {
          if (error?.code !== 404) throw error;
        }
      }
      if (orphans.length > 0)
        console.log(`  - ${orphans.length} satır silindi.`);
    }
  }

  console.log(`\nToplam sahipsiz satır: ${total}.`);
  if (!APPLY && total > 0) {
    console.log("Silmek için: npm run appwrite:cleanup-orphans -- --apply");
  }
}

main().catch((error) => {
  console.error(`\n✗ Hata: ${error?.message ?? error}`);
  if (error?.code) console.error(`  HTTP kodu: ${error.code}`);
  process.exitCode = 1;
});
