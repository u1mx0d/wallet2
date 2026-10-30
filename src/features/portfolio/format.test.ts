import { describe, expect, it } from "vitest";

import { MAX_AMOUNT_MINOR } from "@/domain/money";
import { MAX_LOTS } from "@/domain/portfolio";

import {
    ALLOCATION_COLORS,
    allocationColor,
    formatClock,
    formatLots,
    formatQuoteTime,
    oldestQuoteTime,
    tradeCashMinor,
} from "./format";
import type { Quote } from "./schemas";

describe("formatLots", () => {
  it.each<[number, string]>([
    [1, "1"],
    [999, "999"],
    [1000, "1.000"],
    [1234567, "1.234.567"],
  ])("%d → %s", (lots, expected) => {
    expect(formatLots(lots)).toBe(expected);
  });
});

describe("tradeCashMinor", () => {
  it("alımda komisyon eklenir, satışta düşülür", () => {
    expect(
      tradeCashMinor({
        side: "buy",
        lots: 10,
        priceMinor: 24830,
        feeMinor: 500,
      }),
    ).toBe(248_800);
    expect(
      tradeCashMinor({
        side: "sell",
        lots: 10,
        priceMinor: 24830,
        feeMinor: 500,
      }),
    ).toBe(247_800);
  });

  it("sınırı aşan tutarda null", () => {
    expect(
      tradeCashMinor({
        side: "buy",
        lots: MAX_LOTS,
        priceMinor: MAX_AMOUNT_MINOR,
        feeMinor: 0,
      }),
    ).toBeNull();
  });
});

describe("formatClock / formatQuoteTime", () => {
  const now = new Date(2026, 9, 30, 14, 0);

  it("saati iki haneli yazar", () => {
    expect(formatClock(new Date(2026, 9, 30, 9, 5))).toBe("09:05");
  });

  it("gün etiketiyle birleştirir", () => {
    expect(
      formatQuoteTime(new Date(2026, 9, 30, 11, 50).toISOString(), now),
    ).toBe("Bugün 11:50");
    expect(
      formatQuoteTime(new Date(2026, 9, 29, 18, 10).toISOString(), now),
    ).toBe("Dün 18:10");
  });
});

describe("oldestQuoteTime", () => {
  const quote = (updatedAt: string): Quote => ({
    symbol: "X",
    name: "X",
    priceMinor: 100,
    prevCloseMinor: null,
    updatedAt,
    source: "burkut",
    stale: false,
  });

  it("en eski zamanı verir; boş listede null", () => {
    expect(
      oldestQuoteTime([
        quote("2026-10-30T09:00:00Z"),
        quote("2026-10-30T08:00:00Z"),
        quote("2026-10-30T10:00:00Z"),
      ]),
    ).toBe("2026-10-30T08:00:00Z");
    expect(oldestQuoteTime([])).toBeNull();
  });
});

describe("allocationColor", () => {
  it("paleti döngüsel kullanır", () => {
    expect(allocationColor(0)).toBe(ALLOCATION_COLORS[0]);
    expect(allocationColor(ALLOCATION_COLORS.length)).toBe(
      ALLOCATION_COLORS[0],
    );
  });
});
