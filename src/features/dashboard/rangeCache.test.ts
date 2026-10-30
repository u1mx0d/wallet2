import { describe, expect, it } from "vitest";

import type { Transaction } from "@/features/transactions/schemas";

import type { RangeResult } from "./api";
import {
    isInRange,
    rangeBoundsFromKey,
    removeFromRange,
    upsertInRange,
} from "./rangeCache";

const october = {
  from: new Date(2026, 9, 1).toISOString(),
  to: new Date(new Date(2026, 10, 1).getTime() - 1).toISOString(),
};

function tx(
  id: string,
  day: number,
  month = 9,
  overrides: Partial<Transaction> = {},
): Transaction {
  const date = new Date(2026, month, day, 12).toISOString();
  return {
    id,
    type: "expense",
    amountMinor: 1000,
    categoryId: "c",
    note: null,
    date,
    createdAt: date,
    ...overrides,
  };
}

const range = (...transactions: Transaction[]): RangeResult => ({
  transactions,
  truncated: false,
});
const ids = (data: RangeResult) =>
  data.transactions.map((transaction) => transaction.id);

describe("rangeBoundsFromKey", () => {
  it("anahtarın 4. ve 5. elemanını okur", () => {
    expect(
      rangeBoundsFromKey(["transactions", "u1", "range", "a", "b"]),
    ).toEqual({ from: "a", to: "b" });
    expect(rangeBoundsFromKey(["transactions", "u1", "list", {}])).toBeNull();
  });
});

describe("isInRange", () => {
  it("sınırlar dahil", () => {
    expect(isInRange(tx("a", 1), october.from, october.to)).toBe(true);
    expect(isInRange(tx("a", 31), october.from, october.to)).toBe(true);
    expect(isInRange(tx("a", 1, 10), october.from, october.to)).toBe(false);
  });
});

describe("upsertInRange", () => {
  it("aralıktaki yeni işlemi sıralı ekler", () => {
    const result = upsertInRange(
      range(tx("old", 5), tx("new", 20)),
      tx("mid", 10),
      october.from,
      october.to,
    );
    expect(ids(result)).toEqual(["new", "mid", "old"]);
  });

  it("aralık dışındaki işlemi eklemez", () => {
    const data = range(tx("a", 5));
    expect(
      ids(upsertInRange(data, tx("b", 3, 10), october.from, october.to)),
    ).toEqual(["a"]);
  });

  it("tarihi aralık dışına taşınan işlemi çıkarır", () => {
    const data = range(tx("a", 5), tx("b", 6));
    expect(
      ids(upsertInRange(data, tx("a", 3, 10), october.from, october.to)),
    ).toEqual(["b"]);
  });

  it("tutarı değişen işlemi güncelleyip çoğaltmaz", () => {
    const result = upsertInRange(
      range(tx("a", 5)),
      tx("a", 5, 9, { amountMinor: 9999 }),
      october.from,
      october.to,
    );
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]?.amountMinor).toBe(9999);
  });

  it("truncated bilgisini korur", () => {
    const data: RangeResult = { transactions: [], truncated: true };
    expect(
      upsertInRange(data, tx("a", 5), october.from, october.to).truncated,
    ).toBe(true);
  });
});

describe("removeFromRange", () => {
  it("ID ile kaldırır; yoksa aynı nesneyi döner", () => {
    const data = range(tx("a", 5), tx("b", 6));
    expect(ids(removeFromRange(data, "a"))).toEqual(["b"]);
    expect(removeFromRange(data, "yok")).toBe(data);
  });
});
