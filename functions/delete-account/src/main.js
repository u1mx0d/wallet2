/**
 * Hesap silme.
 *
 * Yalnızca giriş yapmış kullanıcının uygulamadan yaptığı http çağrısıyla çalışır.
 * Silinecek kullanıcı x-appwrite-user-id header'ından belirlenir; istek gövdesi
 * YOK SAYILIR.
 *
 * Sıra: önce kullanıcının tüm satırları, en son kullanıcının kendisi.
 * Satır silme yarıda kalırsa kullanıcı hâlâ vardır ve tekrar deneyebilir.
 * İdempotent: tekrar çalıştırılınca kalan satırlardan devam eder.
 */
import { Client, Query, TablesDB, Users } from "node-appwrite";

// scripts/appwrite/setup.mjs ve src/lib/appwrite/schema.ts ile aynı olmalı.
const DATABASE_ID = "wallet";
// price_cache kullanıcıya ait değildir; silinmez.
const USER_TABLE_IDS = ["transactions", "trades", "categories"];
const PAGE_SIZE = 100;
// Sonsuz döngü koruması: tablo başına en fazla 1000 sayfa (100.000 satır).
const MAX_PAGES_PER_TABLE = 1000;

async function deleteUserRows(tablesDB, tableId, userId) {
  let deleted = 0;

  for (let page = 0; page < MAX_PAGES_PER_TABLE; page += 1) {
    // Her seferinde İLK sayfayı istiyoruz: silinen satırlar listeden çıktığı için
    // bir sonraki istek doğal olarak kalanları getirir.
    const result = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId,
      queries: [Query.equal("userId", userId), Query.limit(PAGE_SIZE)],
    });

    if (result.rows.length === 0) return deleted;

    for (const row of result.rows) {
      try {
        await tablesDB.deleteRow({
          databaseId: DATABASE_ID,
          tableId,
          rowId: row.$id,
        });
        deleted += 1;
      } catch (cause) {
        // Başka bir çalıştırma aynı satırı az önce silmiş olabilir.
        if (cause?.code !== 404) throw cause;
      }
    }
  }

  throw new Error(`${tableId}: sayfa sınırı aşıldı, silme tamamlanamadı.`);
}

export default async ({ req, res, log, error }) => {
  if (req.headers["x-appwrite-trigger"] !== "http") {
    return res.json({ ok: false, error: "unsupported_trigger" }, 400);
  }

  const userId = req.headers["x-appwrite-user-id"];
  if (typeof userId !== "string" || userId.length === 0) {
    return res.json({ ok: false, error: "unauthorized" }, 401);
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers["x-appwrite-key"]);
  const tablesDB = new TablesDB(client);
  const users = new Users(client);

  const deleted = {};

  try {
    for (const tableId of USER_TABLE_IDS) {
      deleted[tableId] = await deleteUserRows(tablesDB, tableId, userId);
    }
    await users.delete({ userId });
  } catch (cause) {
    error(
      `Kullanıcı ${userId} silinemedi: ${cause?.message ?? cause} (silinen: ${JSON.stringify(deleted)})`,
    );
    return res.json({ ok: false, error: "delete_failed", deleted }, 500);
  }

  // Loglarda yalnızca kullanıcı ID'si ve sayılar var; e-posta, ad gibi kişisel veri yok.
  log(`Kullanıcı ${userId} ve verileri silindi: ${JSON.stringify(deleted)}`);
  return res.json({ ok: true, deleted });
};
