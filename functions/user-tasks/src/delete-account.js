/**
 * Hesap silme: önce kullanıcının tüm satırları, en son kullanıcının kendisi.
 * Satır silme yarıda kalırsa kullanıcı hâlâ vardır ve tekrar deneyebilir (idempotent).
 */
import { Query } from "node-appwrite";

import { DATABASE_ID } from "./constants.js";

// price_cache kullanıcıya ait değildir; silinmez.
const USER_TABLE_IDS = ["transactions", "trades", "categories"];
const PAGE_SIZE = 100;
// Sonsuz döngü koruması: tablo başına en fazla 1000 sayfa (100.000 satır).
const MAX_PAGES_PER_TABLE = 1000;

async function deleteUserRows(tablesDB, tableId, userId) {
  let deleted = 0;

  for (let page = 0; page < MAX_PAGES_PER_TABLE; page += 1) {
    // Her seferinde İLK sayfa: silinen satırlar listeden çıktığı için sonraki istek kalanları getirir.
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

export async function deleteUserAndData({ tablesDB, users, userId }) {
  const deleted = {};
  for (const tableId of USER_TABLE_IDS) {
    deleted[tableId] = await deleteUserRows(tablesDB, tableId, userId);
  }
  await users.delete({ userId });
  return deleted;
}
