import { describe, expect, it } from "vitest";

import {
    allocateBasisPoints,
    BASIS_POINTS_TOTAL,
    cumulativeNetTrend,
    DELETED_CATEGORY_NAME,
    expenseBreakdown,
    formatBasisPoints,
    formatCompactTry,
    monthlyTotals,
    monthsEnding,
    monthsToRange,
    OTHER_SLICE_KEY,
    summarize,
    type AggregatableTransaction,
    type CategoryMeta,
} from "./aggregations";
import { MAX_AMOUNT_MINOR, MINUS_SIGN } from "./money";

function tx(
  type: "income" | "expense",
  amountMinor: number,
  categoryId: string,
  date: Date,
): AggregatableTransaction {
  return { type, amountMinor, categoryId, date: date.toISOString() };
}

const category = (id: string, name: string): CategoryMeta => ({
  id,
  name,
  icon: "dots",
  color: "#2563EB",
});

describe("summarize", () => {
  it("gelir, gider ve neti hesaplar", () => {
    const result = summarize([
      tx("income", 500_000, "salary", new Date(2026, 9, 1)),
      tx("expense", 123_456, "market", new Date(2026, 9, 2)),
      tx("expense", 10, "market", new Date(2026, 9, 3)),
    ]);
    expect(result).toEqual({
      incomeMinor: 500_000,
      expenseMinor: 123_466,
      netMinor: 376_534,
      count: 3,
    });
  });

  it("net negatif olabilir; boş listede sıfır", () => {
    expect(
      summarize([tx("expense", 100, "a", new Date(2026, 9, 1))]).netMinor,
    ).toBe(-100);
    expect(summarize([])).toEqual({
      incomeMinor: 0,
      expenseMinor: 0,
      netMinor: 0,
      count: 0,
    });
  });
});

describe("allocateBasisPoints", () => {
  const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

  it("üç eşit pay toplamı tam 10.000 eder", () => {
    const result = allocateBasisPoints([1, 1, 1]);
    expect(sum(result)).toBe(BASIS_POINTS_TOTAL);
    expect(result).toEqual([3334, 3333, 3333]);
  });

  it("tam bölünen değerleri olduğu gibi verir", () => {
    expect(allocateBasisPoints([1, 3])).toEqual([2500, 7500]);
  });

  it("toplam sıfırsa hepsi sıfır", () => {
    expect(allocateBasisPoints([0, 0])).toEqual([0, 0]);
  });

  it("çok büyük tutarlarda taşma olmadan çalışır", () => {
    const result = allocateBasisPoints([MAX_AMOUNT_MINOR, MAX_AMOUNT_MINOR, 1]);
    expect(sum(result)).toBe(BASIS_POINTS_TOTAL);
    expect(result).toEqual([5000, 5000, 0]);
  });

  it("rastgele dağılımlarda toplam her zaman 10.000", () => {
    let seed = 7;
    const next = () => {
      seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
      return seed;
    };
    for (let i = 0; i < 500; i += 1) {
      const values = Array.from(
        { length: 1 + (next() % 8) },
        () => next() % 1_000_000,
      );
      if (sum(values) === 0) continue;
      expect(sum(allocateBasisPoints(values))).toBe(BASIS_POINTS_TOTAL);
    }
  });

  it("negatif veya tam sayı olmayan değeri reddeder", () => {
    expect(() => allocateBasisPoints([-1, 2])).toThrow(RangeError);
    expect(() => allocateBasisPoints([1.5])).toThrow(RangeError);
  });
});

describe("formatBasisPoints", () => {
  it.each<[number, string]>([
    [10_000, "%100,0"],
    [1234, "%12,3"],
    [5, "%0,1"],
    [0, "%0,0"],
  ])("%d → %s", (basisPoints, expected) => {
    expect(formatBasisPoints(basisPoints)).toBe(expected);
  });
});

describe("expenseBreakdown", () => {
  const categories = [
    category("market", "Market"),
    category("rent", "Kira"),
    category("fun", "Eğlence"),
  ];
  const day = new Date(2026, 9, 10);

  it("yalnızca giderleri büyükten küçüğe sıralar ve yüzdeleri verir", () => {
    const result = expenseBreakdown(
      [
        tx("expense", 30_000, "market", day),
        tx("expense", 70_000, "rent", day),
        tx("income", 999_999, "salary", day),
      ],
      categories,
    );
    expect(
      result.map((slice) => [slice.name, slice.amountMinor, slice.basisPoints]),
    ).toEqual([
      ["Kira", 70_000, 7000],
      ["Market", 30_000, 3000],
    ]);
  });

  it("aynı kategorinin işlemlerini toplar", () => {
    const result = expenseBreakdown(
      [tx("expense", 100, "market", day), tx("expense", 250, "market", day)],
      categories,
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.amountMinor).toBe(350);
    expect(result[0]?.basisPoints).toBe(BASIS_POINTS_TOTAL);
  });

  it("silinmiş kategoriyi adıyla işaretler, tutarı kaybetmez", () => {
    const result = expenseBreakdown(
      [tx("expense", 500, "silinen-id", day)],
      categories,
    );
    expect(result[0]?.name).toBe(DELETED_CATEGORY_NAME);
    expect(result[0]?.amountMinor).toBe(500);
  });

  it("dilim sınırını aşan küçük kategorileri 'Diğer'de birleştirir", () => {
    const transactions = [600, 500, 400, 300, 200, 100, 50].map(
      (amount, index) => tx("expense", amount, `c${index}`, day),
    );
    const result = expenseBreakdown(transactions, [], 6);
    expect(result).toHaveLength(6);
    const other = result[5];
    expect(other?.key).toBe(OTHER_SLICE_KEY);
    expect(other?.categoryId).toBeNull();
    expect(other?.amountMinor).toBe(100 + 50);
    expect(result.reduce((sum, slice) => sum + slice.basisPoints, 0)).toBe(
      BASIS_POINTS_TOTAL,
    );
  });

  it("gider yoksa boş döner", () => {
    expect(
      expenseBreakdown([tx("income", 100, "salary", day)], categories),
    ).toEqual([]);
  });
});

describe("monthsEnding / monthsToRange / monthlyTotals", () => {
  it("yıl geçişinde ayları doğru üretir", () => {
    expect(monthsEnding(new Date(2026, 1, 15), 3)).toEqual([
      { year: 2025, month: 11 },
      { year: 2026, month: 0 },
      { year: 2026, month: 1 },
    ]);
  });

  it("ay listesini tarih aralığına çevirir", () => {
    expect(monthsToRange(monthsEnding(new Date(2026, 1, 15), 3))).toEqual({
      start: new Date(2025, 11, 1),
      end: new Date(2026, 2, 1),
    });
  });

  it("işlemleri aylara dağıtır; aralık dışındakileri atlar", () => {
    const months = monthsEnding(new Date(2026, 9, 1), 2);
    const result = monthlyTotals(
      [
        tx("income", 1000, "s", new Date(2026, 8, 30, 23, 0)),
        tx("expense", 300, "m", new Date(2026, 9, 1, 0, 30)),
        tx("expense", 200, "m", new Date(2026, 9, 31, 23, 59)),
        tx("expense", 999, "m", new Date(2026, 7, 31)),
      ],
      months,
    );
    expect(
      result.map((month) => [
        month.label,
        month.incomeMinor,
        month.expenseMinor,
      ]),
    ).toEqual([
      ["Eyl", 1000, 0],
      ["Eki", 0, 500],
    ]);
  });
});

describe("cumulativeNetTrend", () => {
  const october = { start: new Date(2026, 9, 1), end: new Date(2026, 10, 1) };

  it("günlük birikimli net değişimi bugüne kadar hesaplar", () => {
    const now = new Date(2026, 9, 3, 18, 0);
    const result = cumulativeNetTrend(
      [
        tx("income", 1000, "s", new Date(2026, 9, 1, 9)),
        tx("expense", 300, "m", new Date(2026, 9, 1, 20)),
        tx("expense", 500, "m", new Date(2026, 9, 3, 10)),
      ],
      october,
      now,
    );
    expect(result.granularity).toBe("day");
    expect(
      result.points.map((point) => [
        point.label,
        point.netMinor,
        point.cumulativeMinor,
      ]),
    ).toEqual([
      ["1", 700, 700],
      ["2", 0, 700],
      ["3", -500, 200],
    ]);
  });

  it("dönem bittiyse tüm günleri üretir", () => {
    const result = cumulativeNetTrend([], october, new Date(2026, 11, 1));
    expect(result.points).toHaveLength(31);
  });

  it("dönem tamamen gelecekteyse boş döner", () => {
    expect(
      cumulativeNetTrend([], october, new Date(2026, 8, 15)).points,
    ).toEqual([]);
  });

  it("62 günden uzun dönemde aylık hesaplar", () => {
    const year = { start: new Date(2026, 0, 1), end: new Date(2027, 0, 1) };
    const result = cumulativeNetTrend(
      [
        tx("income", 1000, "s", new Date(2026, 0, 15)),
        tx("expense", 400, "m", new Date(2026, 2, 5)),
      ],
      year,
      new Date(2026, 2, 20),
    );
    expect(result.granularity).toBe("month");
    expect(
      result.points.map((point) => [point.label, point.cumulativeMinor]),
    ).toEqual([
      ["Oca", 1000],
      ["Şub", 1000],
      ["Mar", 600],
    ]);
  });
});

describe("formatCompactTry", () => {
  it.each<[number, string]>([
    [0, "₺0"],
    [12_345, "₺123,5"],
    [123_456, "₺1,2B"],
    [100_000, "₺1B"],
    [123_456_789, "₺1,2Mn"],
    [-50_000_000, `${MINUS_SIGN}₺500B`],
    [MAX_AMOUNT_MINOR, "₺10Mr"],
  ])("%d → %s", (minor, expected) => {
    expect(formatCompactTry(minor)).toBe(expected);
  });
});
