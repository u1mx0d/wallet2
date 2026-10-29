import { describe, expect, it } from "vitest";

import type { Category } from "@/features/categories/schemas";

import { matchesFilters } from "./cache";
import {
    buildTransactionFilters,
    countActiveFilters,
    groupTransactionsByDay,
    matchingCategoryIds,
    type HistoryFilterState,
} from "./history";
import type { Transaction } from "./schemas";

function tx(
  id: string,
  date: Date,
  overrides: Partial<Transaction> = {},
): Transaction {
  return {
    id,
    type: "expense",
    amountMinor: 1000,
    categoryId: "market",
    note: null,
    date: date.toISOString(),
    createdAt: date.toISOString(),
    ...overrides,
  };
}

const categories: Category[] = [
  {
    id: "market",
    name: "Market",
    type: "expense",
    icon: "cart",
    color: "#16A34A",
  },
  {
    id: "transport",
    name: "Ulaşım",
    type: "expense",
    icon: "bus",
    color: "#2563EB",
  },
  {
    id: "salary",
    name: "Maaş",
    type: "income",
    icon: "briefcase",
    color: "#15803D",
  },
  {
    id: "heat",
    name: "Isınma",
    type: "expense",
    icon: "home",
    color: "#DC2626",
  },
];

const now = new Date(2026, 9, 29, 20, 0);

describe("groupTransactionsByDay", () => {
  it("gün değiştikçe başlık ekler ve başlık konumlarını verir", () => {
    const result = groupTransactionsByDay(
      [
        tx("a", new Date(2026, 9, 29, 18)),
        tx("b", new Date(2026, 9, 29, 9)),
        tx("c", new Date(2026, 9, 28, 12)),
        tx("d", new Date(2026, 9, 20, 12)),
      ],
      now,
    );
    expect(
      result.rows.map((row) =>
        row.kind === "header" ? `# ${row.label}` : row.key,
      ),
    ).toEqual(["# Bugün", "a", "b", "# Dün", "c", "# 20 Ekim", "d"]);
    expect(result.headerIndices).toEqual([0, 3, 5]);
  });

  it("boş listede boş döner", () => {
    expect(groupTransactionsByDay([], now)).toEqual({
      rows: [],
      headerIndices: [],
    });
  });
});

describe("matchingCategoryIds", () => {
  it("Türkçe kurallarla büyük/küçük harf duyarsız arar", () => {
    expect(matchingCategoryIds(categories, "mar")).toEqual(["market"]);
    expect(matchingCategoryIds(categories, "ULAŞ")).toEqual(["transport"]);
    expect(matchingCategoryIds(categories, "ısın")).toEqual(["heat"]);
    expect(matchingCategoryIds(categories, "maaş")).toEqual(["salary"]);
  });

  it("boş aramada hiçbir şey döndürmez", () => {
    expect(matchingCategoryIds(categories, "   ")).toEqual([]);
  });
});

describe("buildTransactionFilters", () => {
  const empty: HistoryFilterState = {
    type: "all",
    categoryId: "",
    dateRange: null,
    search: "",
  };

  it("filtresiz durumda boş nesne döner", () => {
    expect(buildTransactionFilters(empty, categories, now)).toEqual({});
  });

  it("tür, kategori ve tarih aralığını çevirir", () => {
    const filters = buildTransactionFilters(
      {
        ...empty,
        type: "expense",
        categoryId: "market",
        dateRange: { start: new Date(2026, 9, 1), end: new Date(2026, 9, 15) },
      },
      categories,
      now,
    );
    expect(filters.type).toBe("expense");
    expect(filters.categoryId).toBe("market");
    expect(filters.from).toBe(new Date(2026, 9, 1).toISOString());
    expect(new Date(filters.to ?? "").getTime()).toBe(
      new Date(2026, 9, 16).getTime() - 1,
    );
  });

  it("kısa aramayı yok sayar, uzun aramada eşleşen kategorileri ekler", () => {
    expect(
      buildTransactionFilters({ ...empty, search: "m" }, categories, now)
        .search,
    ).toBeUndefined();
    expect(
      buildTransactionFilters({ ...empty, search: " mar " }, categories, now),
    ).toEqual({
      search: "mar",
      searchCategoryIds: ["market"],
    });
    expect(
      buildTransactionFilters({ ...empty, search: "kahve" }, categories, now),
    ).toEqual({ search: "kahve" });
  });

  it("etkin filtre sayısı aramayı saymaz", () => {
    expect(countActiveFilters({ ...empty, search: "market" })).toBe(0);
    expect(
      countActiveFilters({
        type: "income",
        categoryId: "salary",
        dateRange: { start: now, end: now },
        search: "",
      }),
    ).toBe(3);
  });
});

describe("matchesFilters: arama", () => {
  const filters = buildTransactionFilters(
    { type: "all", categoryId: "", dateRange: null, search: "mar" },
    categories,
    now,
  );

  it("kategori adı eşleşirse uyar", () => {
    expect(
      matchesFilters(tx("a", now, { categoryId: "market" }), filters),
    ).toBe(true);
  });

  it("not eşleşirse uyar (büyük/küçük harf duyarsız)", () => {
    expect(
      matchesFilters(
        tx("a", now, { categoryId: "transport", note: "MARMARAY kart" }),
        filters,
      ),
    ).toBe(true);
  });

  it("ikisi de eşleşmezse uymaz", () => {
    expect(
      matchesFilters(
        tx("a", now, { categoryId: "transport", note: "otobüs" }),
        filters,
      ),
    ).toBe(false);
    expect(
      matchesFilters(
        tx("a", now, { categoryId: "transport", note: null }),
        filters,
      ),
    ).toBe(false);
  });
});
