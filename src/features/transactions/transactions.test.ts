import { describe, expect, it } from "vitest";

import {
    compareTransactions,
    insertTransaction,
    matchesFilters,
    removeTransaction,
    replaceTransaction,
    type TransactionPage,
    type TransactionPages,
} from "./cache";
import {
    parseTransactionRow,
    transactionInputSchema,
    type Transaction,
} from "./schemas";

function tx(
  id: string,
  day: string,
  overrides: Partial<Transaction> = {},
): Transaction {
  return {
    id,
    type: "expense",
    amountMinor: 1000,
    categoryId: "cat-1",
    note: null,
    date: `2026-10-${day}T12:00:00.000+00:00`,
    createdAt: `2026-10-${day}T12:00:00.000+00:00`,
    ...overrides,
  };
}

function pages(...list: TransactionPage[]): TransactionPages {
  return {
    pages: list,
    pageParams: list.map((_, index) =>
      index === 0 ? null : `cursor-${index}`,
    ),
  };
}

function ids(data: TransactionPages): string[][] {
  return data.pages.map((page) => page.items.map((item) => item.id));
}

describe("parseTransactionRow", () => {
  const row = {
    $id: "t1",
    $createdAt: "2026-10-28T09:00:00.000+00:00",
    userId: "u1",
    type: "expense",
    amountMinor: 123456,
    categoryId: "c1",
    note: null,
    date: "2026-10-28T09:00:00.000+00:00",
  };

  it("geçerli satırı dönüştürür", () => {
    expect(parseTransactionRow(row)).toEqual({
      id: "t1",
      type: "expense",
      amountMinor: 123456,
      categoryId: "c1",
      note: null,
      date: "2026-10-28T09:00:00.000+00:00",
      createdAt: "2026-10-28T09:00:00.000+00:00",
    });
  });

  it("not alanı hiç yoksa null yapar", () => {
    const { note: _note, ...withoutNote } = row;
    expect(parseTransactionRow(withoutNote)?.note).toBeNull();
  });

  it.each([
    [{ amountMinor: 12.5 }],
    [{ amountMinor: 0 }],
    [{ amountMinor: -100 }],
    [{ type: "transfer" }],
    [{ date: "dün" }],
    [{ categoryId: "" }],
  ])("geçersiz satırda null döner: %j", (override) => {
    expect(parseTransactionRow({ ...row, ...override })).toBeNull();
  });
});

describe("transactionInputSchema", () => {
  const valid = {
    type: "income",
    amountMinor: 500000,
    categoryId: "c1",
    note: "  Ekim maaşı  ",
    date: "2026-10-28T09:00:00.000Z",
  };

  it("notu kırpar", () => {
    expect(transactionInputSchema.parse(valid).note).toBe("Ekim maaşı");
  });

  it("boş notu null yapar", () => {
    expect(
      transactionInputSchema.parse({ ...valid, note: "   " }).note,
    ).toBeNull();
  });

  it.each([
    [{ amountMinor: 0 }],
    [{ amountMinor: 1.5 }],
    [{ amountMinor: 1_000_000_000_000 }],
    [{ categoryId: "" }],
    [{ note: "x".repeat(501) }],
    [{ date: "2026-10-28" }],
  ])("geçersiz girişi reddeder: %j", (override) => {
    expect(
      transactionInputSchema.safeParse({ ...valid, ...override }).success,
    ).toBe(false);
  });
});

describe("compareTransactions", () => {
  it("yeni tarihli işlem önce gelir", () => {
    expect(compareTransactions(tx("a", "28"), tx("b", "27"))).toBeLessThan(0);
    expect(compareTransactions(tx("a", "27"), tx("b", "28"))).toBeGreaterThan(
      0,
    );
  });

  it("aynı tarihte sonradan eklenen önce gelir", () => {
    const older = tx("a", "28", { createdAt: "2026-10-28T08:00:00.000+00:00" });
    const newer = tx("b", "28", { createdAt: "2026-10-28T10:00:00.000+00:00" });
    expect(compareTransactions(newer, older)).toBeLessThan(0);
  });
});

describe("matchesFilters", () => {
  const item = tx("a", "15", { type: "income", categoryId: "salary" });

  it("filtresiz her işlem uyar", () => {
    expect(matchesFilters(item, {})).toBe(true);
  });

  it("tür, kategori ve tarih aralığını uygular", () => {
    expect(matchesFilters(item, { type: "expense" })).toBe(false);
    expect(matchesFilters(item, { categoryId: "rent" })).toBe(false);
    expect(matchesFilters(item, { from: "2026-10-16T00:00:00.000Z" })).toBe(
      false,
    );
    expect(matchesFilters(item, { to: "2026-10-14T23:59:59.999Z" })).toBe(
      false,
    );
    expect(
      matchesFilters(item, {
        type: "income",
        categoryId: "salary",
        from: "2026-10-01T00:00:00.000Z",
        to: "2026-10-31T23:59:59.999Z",
      }),
    ).toBe(true);
  });
});

describe("insertTransaction", () => {
  // Sayfa 1: 28, 27 (devamı var) | Sayfa 2: 25 (son sayfa)
  const loaded = pages(
    { items: [tx("t28", "28"), tx("t27", "27")], nextCursor: "t27" },
    { items: [tx("t25", "25")], nextCursor: null },
  );

  it("en yeni işlemi ilk sayfanın başına ekler", () => {
    expect(ids(insertTransaction(loaded, tx("new", "29"), {}))).toEqual([
      ["new", "t28", "t27"],
      ["t25"],
    ]);
  });

  it("araya düşen işlemi doğru sayfaya ve sıraya ekler", () => {
    expect(ids(insertTransaction(loaded, tx("new", "26"), {}))).toEqual([
      ["t28", "t27"],
      ["new", "t25"],
    ]);
  });

  it("tümü yüklenmişse en eski işlemi son sayfanın sonuna ekler", () => {
    expect(ids(insertTransaction(loaded, tx("new", "20"), {}))).toEqual([
      ["t28", "t27"],
      ["t25", "new"],
    ]);
  });

  it("sunucuda daha eski sayfa varsa yüklenmemiş bölgeye düşen işlemi eklemez", () => {
    const partial = pages({
      items: [tx("t28", "28"), tx("t27", "27")],
      nextCursor: "t27",
    });
    expect(ids(insertTransaction(partial, tx("new", "20"), {}))).toEqual([
      ["t28", "t27"],
    ]);
  });

  it("filtreye uymayan işlemi eklemez", () => {
    expect(
      ids(
        insertTransaction(loaded, tx("new", "29", { type: "income" }), {
          type: "expense",
        }),
      ),
    ).toEqual([["t28", "t27"], ["t25"]]);
  });

  it("aynı ID'yi çoğaltmaz", () => {
    expect(ids(insertTransaction(loaded, tx("t27", "27"), {}))).toEqual([
      ["t28", "t27"],
      ["t25"],
    ]);
  });

  it("boş listeye ekler", () => {
    const empty = pages({ items: [], nextCursor: null });
    expect(ids(insertTransaction(empty, tx("new", "28"), {}))).toEqual([
      ["new"],
    ]);
  });

  it("girdi nesnesini değiştirmez", () => {
    insertTransaction(loaded, tx("new", "29"), {});
    expect(ids(loaded)).toEqual([["t28", "t27"], ["t25"]]);
  });
});

describe("replaceTransaction / removeTransaction", () => {
  const loaded = pages(
    { items: [tx("t28", "28"), tx("t27", "27")], nextCursor: "t27" },
    { items: [tx("t25", "25")], nextCursor: null },
  );

  it("tarihi değişen işlemi yeni konumuna taşır", () => {
    expect(ids(replaceTransaction(loaded, tx("t28", "24"), {}))).toEqual([
      ["t27"],
      ["t25", "t28"],
    ]);
  });

  it("yalnızca tutarı değişen işlem sayfa sınırında yerinde kalır", () => {
    const result = replaceTransaction(
      loaded,
      tx("t27", "27", { amountMinor: 9999 }),
      {},
    );
    expect(ids(result)).toEqual([["t28", "t27"], ["t25"]]);
    expect(result.pages[0]?.items[1]?.amountMinor).toBe(9999);
  });

  it("ikinci sayfanın ilk kaydı tekrar eklenince yerinde kalır", () => {
    expect(ids(replaceTransaction(loaded, tx("t25", "25"), {}))).toEqual([
      ["t28", "t27"],
      ["t25"],
    ]);
  });

  it("artık filtreye uymayan işlemi listeden çıkarır", () => {
    expect(
      ids(
        replaceTransaction(loaded, tx("t27", "27", { type: "income" }), {
          type: "expense",
        }),
      ),
    ).toEqual([["t28"], ["t25"]]);
  });

  it("ID ile kaldırır", () => {
    expect(ids(removeTransaction(loaded, "t27"))).toEqual([["t28"], ["t25"]]);
  });

  it("olmayan ID'de aynı nesneyi döner", () => {
    expect(removeTransaction(loaded, "yok")).toBe(loaded);
  });
});
