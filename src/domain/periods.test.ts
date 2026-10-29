import { describe, expect, it } from "vitest";

import {
    daysInRange,
    formatPeriodLabel,
    resolvePeriod,
    toQueryBounds,
} from "./periods";

// 29 Ekim 2026 perşembe.
const thursday = new Date(2026, 9, 29, 15, 0);

describe("resolvePeriod", () => {
  it("hafta pazartesi başlar", () => {
    expect(resolvePeriod({ kind: "week" }, thursday)).toEqual({
      start: new Date(2026, 9, 26),
      end: new Date(2026, 10, 2),
    });
  });

  it("pazar günü haftanın son günüdür", () => {
    expect(
      resolvePeriod({ kind: "week" }, new Date(2026, 10, 1, 22, 0)).start,
    ).toEqual(new Date(2026, 9, 26));
  });

  it("pazartesi günü yeni hafta başlar", () => {
    expect(
      resolvePeriod({ kind: "week" }, new Date(2026, 10, 2, 0, 30)).start,
    ).toEqual(new Date(2026, 10, 2));
  });

  it("ay ve yıl", () => {
    expect(resolvePeriod({ kind: "month" }, thursday)).toEqual({
      start: new Date(2026, 9, 1),
      end: new Date(2026, 10, 1),
    });
    expect(resolvePeriod({ kind: "year" }, thursday)).toEqual({
      start: new Date(2026, 0, 1),
      end: new Date(2027, 0, 1),
    });
  });

  it("aralık ayında yıl geçişi", () => {
    expect(
      resolvePeriod({ kind: "month" }, new Date(2026, 11, 15)).end,
    ).toEqual(new Date(2027, 0, 1));
  });

  it("özel dönemde iki gün de dahildir ve ters sıra düzeltilir", () => {
    const expected = {
      start: new Date(2026, 9, 1),
      end: new Date(2026, 9, 16),
    };
    expect(
      resolvePeriod(
        {
          kind: "custom",
          start: new Date(2026, 9, 1, 18),
          end: new Date(2026, 9, 15, 9),
        },
        thursday,
      ),
    ).toEqual(expected);
    expect(
      resolvePeriod(
        {
          kind: "custom",
          start: new Date(2026, 9, 15),
          end: new Date(2026, 9, 1),
        },
        thursday,
      ),
    ).toEqual(expected);
  });
});

describe("toQueryBounds / daysInRange", () => {
  it("bitişi 1 ms öncesine çeker (dahil-dahil sorgu için)", () => {
    const range = { start: new Date(2026, 9, 1), end: new Date(2026, 10, 1) };
    const bounds = toQueryBounds(range);
    expect(bounds.from).toBe(range.start.toISOString());
    expect(new Date(bounds.to).getTime()).toBe(range.end.getTime() - 1);
  });

  it("gün sayısı", () => {
    expect(daysInRange(resolvePeriod({ kind: "week" }, thursday))).toBe(7);
    expect(daysInRange(resolvePeriod({ kind: "month" }, thursday))).toBe(31);
    expect(daysInRange(resolvePeriod({ kind: "year" }, thursday))).toBe(365);
  });
});

describe("formatPeriodLabel", () => {
  it.each([
    [{ kind: "week" } as const, "Bu hafta"],
    [{ kind: "month" } as const, "Ekim 2026"],
    [{ kind: "year" } as const, "2026"],
  ])("%j → %s", (period, expected) => {
    expect(formatPeriodLabel(period, thursday)).toBe(expected);
  });

  it("özel dönem", () => {
    expect(
      formatPeriodLabel(
        {
          kind: "custom",
          start: new Date(2026, 9, 1),
          end: new Date(2026, 9, 15),
        },
        thursday,
      ),
    ).toBe("1 Eki – 15 Eki 2026");
    expect(
      formatPeriodLabel(
        {
          kind: "custom",
          start: new Date(2025, 11, 20),
          end: new Date(2026, 0, 10),
        },
        thursday,
      ),
    ).toBe("20 Ara 2025 – 10 Oca 2026");
  });
});
