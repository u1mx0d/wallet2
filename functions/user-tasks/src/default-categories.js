/**
 * Varsayılan kategoriler. İdempotent: satır ID'leri sabittir (`${userId}_${slug}`);
 * tekrar çalışırsa Appwrite 409 döner ve bu "zaten var" sayılır.
 */
import { Permission, Role } from "node-appwrite";

import { DATABASE_ID } from "./constants.js";

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

export async function createDefaultCategories({ tablesDB, userId }) {
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
      throw new Error(`Satır ID'si çok uzun (${rowId.length}): ${rowId}`);
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
      if (cause?.code !== 409)
        throw new Error(
          `Kategori oluşturulamadı (${category.slug}): ${cause?.message ?? cause}`,
        );
      existing += 1;
    }
  }

  return { created, existing };
}
