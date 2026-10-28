/**
 * Varsayılan kategoriler.
 *
 * Tetiklenme:
 *  - event: users.*.create → yeni kullanıcı oluşturulunca otomatik.
 *  - http: giriş yapmış kullanıcı uygulamadan çağırır (kategorisi olmayan eski
 *    kullanıcılar için; ADIM 4'te bağlanacak).
 *
 * Güvenlik: Kullanıcı ID'si ASLA istek gövdesinden okunmaz. Event'te Appwrite'ın
 * gönderdiği kullanıcı nesnesinden, http'de x-appwrite-user-id header'ından alınır.
 *
 * İdempotent: Satır ID'leri sabittir (`${userId}_${slug}`). Function tekrar
 * çalışırsa Appwrite 409 döner ve bu "zaten var" sayılır; çift kayıt oluşmaz.
 */
import { Client, Permission, Role, TablesDB } from "node-appwrite";

// scripts/appwrite/setup.mjs ve src/lib/appwrite/schema.ts ile aynı olmalı.
const DATABASE_ID = "wallet";
const CATEGORIES_TABLE_ID = "categories";
const MAX_ROW_ID_LENGTH = 36;

/** slug: satır ID'sinin parçası (küçük harf, ASCII, en fazla 15 karakter). */
const DEFAULT_CATEGORIES = [
  {
    slug: "market",
    name: "Market",
    type: "expense",
    icon: "cart",
    color: "#16A34A",
  },
  {
    slug: "food",
    name: "Yeme-İçme",
    type: "expense",
    icon: "utensils",
    color: "#EA580C",
  },
  {
    slug: "transport",
    name: "Ulaşım",
    type: "expense",
    icon: "bus",
    color: "#2563EB",
  },
  {
    slug: "bills",
    name: "Faturalar",
    type: "expense",
    icon: "receipt",
    color: "#CA8A04",
  },
  {
    slug: "rent",
    name: "Kira",
    type: "expense",
    icon: "home",
    color: "#7C3AED",
  },
  {
    slug: "health",
    name: "Sağlık",
    type: "expense",
    icon: "heart",
    color: "#DC2626",
  },
  {
    slug: "fun",
    name: "Eğlence",
    type: "expense",
    icon: "film",
    color: "#DB2777",
  },
  {
    slug: "clothing",
    name: "Giyim",
    type: "expense",
    icon: "shirt",
    color: "#0891B2",
  },
  {
    slug: "education",
    name: "Eğitim",
    type: "expense",
    icon: "book",
    color: "#4F46E5",
  },
  {
    slug: "other-expense",
    name: "Diğer gider",
    type: "expense",
    icon: "dots",
    color: "#64748B",
  },
  {
    slug: "salary",
    name: "Maaş",
    type: "income",
    icon: "briefcase",
    color: "#15803D",
  },
  {
    slug: "side-income",
    name: "Ek gelir",
    type: "income",
    icon: "sparkles",
    color: "#0D9488",
  },
  {
    slug: "gift",
    name: "Hediye",
    type: "income",
    icon: "gift",
    color: "#C026D3",
  },
  {
    slug: "other-income",
    name: "Diğer gelir",
    type: "income",
    icon: "dots",
    color: "#64748B",
  },
];

function resolveUserId(req) {
  const trigger = req.headers["x-appwrite-trigger"];

  if (trigger === "event") {
    const payload = JSON.parse(req.bodyText || "{}");
    return typeof payload.$id === "string" ? payload.$id : null;
  }

  if (trigger === "http") {
    const userId = req.headers["x-appwrite-user-id"];
    return typeof userId === "string" && userId.length > 0 ? userId : null;
  }

  return null;
}

export default async ({ req, res, log, error }) => {
  const userId = resolveUserId(req);
  if (!userId) {
    return res.json({ ok: false, error: "unauthorized" }, 401);
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers["x-appwrite-key"]);
  const tablesDB = new TablesDB(client);

  const owner = Role.user(userId);
  const permissions = [
    Permission.read(owner),
    Permission.update(owner),
    Permission.delete(owner),
  ];

  let created = 0;
  let existing = 0;

  for (const category of DEFAULT_CATEGORIES) {
    const rowId = `${userId}_${category.slug}`;
    if (rowId.length > MAX_ROW_ID_LENGTH) {
      error(`Satır ID'si çok uzun (${rowId.length}): ${rowId}`);
      return res.json({ ok: false, error: "row_id_too_long" }, 500);
    }

    try {
      await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: CATEGORIES_TABLE_ID,
        rowId,
        data: {
          userId,
          name: category.name,
          type: category.type,
          icon: category.icon,
          color: category.color,
        },
        permissions,
      });
      created += 1;
    } catch (cause) {
      if (cause?.code === 409) {
        existing += 1;
        continue;
      }
      error(
        `Kategori oluşturulamadı (${category.slug}): ${cause?.message ?? cause}`,
      );
      return res.json(
        { ok: false, error: "create_failed", created, existing },
        500,
      );
    }
  }

  log(
    `Kullanıcı ${userId}: ${created} kategori oluşturuldu, ${existing} zaten vardı.`,
  );
  return res.json({ ok: true, created, existing });
};
