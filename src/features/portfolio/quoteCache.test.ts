import { describe, expect, it } from "vitest";

import { upsertQuote } from "./quoteCache";
import type { Quote } from "./schemas";

const quote = (symbol: string, priceMinor: number): Quote => ({
  symbol,
  name: symbol,
  priceMinor,
  prevCloseMinor: null,
  updatedAt: "2026-10-30T08:50:00Z",
  source: "burkut",
  stale: false,
});

describe("upsertQuote", () => {
  const list = [quote("ASELS", 5000), quote("THYAO", 24830)];

  it("listedeki sembolün fiyatını günceller", () => {
    const result = upsertQuote(list, quote("THYAO", 30000));
    expect(result.map((item) => [item.symbol, item.priceMinor])).toEqual([
      ["ASELS", 5000],
      ["THYAO", 30000],
    ]);
  });

  it("listede olmayan sembolde aynı diziyi döner", () => {
    expect(upsertQuote(list, quote("GARAN", 100))).toBe(list);
  });

  it("girdi dizisini değiştirmez", () => {
    upsertQuote(list, quote("THYAO", 1));
    expect(list[1]?.priceMinor).toBe(24830);
  });
});
