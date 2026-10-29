/**
 * Dashboard toplamları. Tüm tutarlar KURUŞ cinsinden tam sayıdır.
 * Yüzdeler BAZ PUAN cinsindendir: 10.000 = %100, 1 = %0,01.
 * Bu dosya saf TypeScript'tir.
 */
import { addLocalDays, startOfLocalDay } from "./dates";
import { assertMinor, MINUS_SIGN, sumMinor } from "./money";
import { daysInRange, TR_MONTHS_SHORT, type DateRange } from "./periods";

export type AggregatableTransaction = {
  type: "income" | "expense";
  amountMinor: number;
  categoryId: string;
  /** ISO tarih-saat. */
  date: string;
};

export type CategoryMeta = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

export const BASIS_POINTS_TOTAL = 10_000;
export const OTHER_SLICE_KEY = "__other__";
export const DELETED_CATEGORY_NAME = "Silinmiş kategori";
const NEUTRAL_COLOR = "#64748B";

/** Uzun dönemlerde trend günlük değil aylık hesaplanır. */
export const DAILY_TREND_MAX_DAYS = 62;

// ─── Özet ──────────────────────────────────────────────────────────────────

export type Summary = {
  incomeMinor: number;
  expenseMinor: number;
  /** Gelir − gider. Negatif olabilir. */
  netMinor: number;
  count: number;
};

export function summarize(
  transactions: readonly AggregatableTransaction[],
): Summary {
  const incomeMinor = sumMinor(
    transactions.filter((t) => t.type === "income").map((t) => t.amountMinor),
  );
  const expenseMinor = sumMinor(
    transactions.filter((t) => t.type === "expense").map((t) => t.amountMinor),
  );
  return {
    incomeMinor,
    expenseMinor,
    netMinor: incomeMinor - expenseMinor,
    count: transactions.length,
  };
}

// ─── Yüzdeler ──────────────────────────────────────────────────────────────

/**
 * Değerleri, toplamı TAM OLARAK 10.000 olan baz puanlara böler ("en büyük kalan" yöntemi).
 * Çarpım BigInt ile yapılır: tutar × 10.000, büyük tutarlarda güvenli tam sayı sınırını aşar.
 * Toplam 0 ise hepsi 0 döner.
 */
export function allocateBasisPoints(values: readonly number[]): number[] {
  for (const value of values) {
    assertMinor(value, "Değer");
    if (value < 0)
      throw new RangeError("Yüzde dağılımında negatif değer olamaz.");
  }
  const total = sumMinor(values);
  if (total === 0) return values.map(() => 0);

  const bigTotal = BigInt(total);
  const scale = BigInt(BASIS_POINTS_TOTAL);
  const parts = values.map((value, index) => {
    const scaled = BigInt(value) * scale;
    return {
      index,
      floor: Number(scaled / bigTotal),
      remainder: scaled % bigTotal,
    };
  });

  let leftover =
    BASIS_POINTS_TOTAL - parts.reduce((sum, part) => sum + part.floor, 0);
  const byRemainder = [...parts].sort((a, b) => {
    if (a.remainder !== b.remainder) return a.remainder > b.remainder ? -1 : 1;
    return a.index - b.index;
  });

  const result = parts.map((part) => part.floor);
  for (const part of byRemainder) {
    if (leftover === 0) break;
    result[part.index] = (result[part.index] ?? 0) + 1;
    leftover -= 1;
  }
  return result;
}

/** 1234 → "%12,3" (Türkçede yüzde işareti sayının önüne yazılır). */
export function formatBasisPoints(basisPoints: number): string {
  const tenths = Math.round(basisPoints / 10);
  return `%${Math.floor(tenths / 10)},${tenths % 10}`;
}

// ─── Kategori dağılımı ─────────────────────────────────────────────────────

export type CategorySlice = {
  /** Benzersiz anahtar: kategori ID'si veya OTHER_SLICE_KEY. */
  key: string;
  /** "Diğer" diliminde null. */
  categoryId: string | null;
  name: string;
  icon: string;
  color: string;
  amountMinor: number;
  basisPoints: number;
};

/** Yüzdeleri henüz hesaplanmamış dilim. categoryId "Diğer" için null olabilir. */
type UnallocatedSlice = Omit<CategorySlice, "basisPoints">;

/**
 * Giderlerin kategori dağılımı, büyükten küçüğe.
 * maxSlices'tan fazla kategori varsa en büyük (maxSlices − 1) tanesi ayrı, kalanı "Diğer" olur.
 */
export function expenseBreakdown(
  transactions: readonly AggregatableTransaction[],
  categories: readonly CategoryMeta[],
  maxSlices = 6,
): CategorySlice[] {
  const totals = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.type !== "expense") continue;
    totals.set(
      transaction.categoryId,
      sumMinor([
        totals.get(transaction.categoryId) ?? 0,
        transaction.amountMinor,
      ]),
    );
  }

  const metaById = new Map(
    categories.map((category) => [category.id, category]),
  );
  const slices: UnallocatedSlice[] = [...totals.entries()].map(
    ([categoryId, amountMinor]) => {
      const meta = metaById.get(categoryId);
      return {
        key: categoryId,
        categoryId,
        name: meta?.name ?? DELETED_CATEGORY_NAME,
        icon: meta?.icon ?? "dots",
        color: meta?.color ?? NEUTRAL_COLOR,
        amountMinor,
      };
    },
  );

  slices.sort(
    (a, b) =>
      b.amountMinor - a.amountMinor || a.name.localeCompare(b.name, "tr"),
  );

  let grouped: UnallocatedSlice[] = slices;
  if (slices.length > maxSlices) {
    const head = slices.slice(0, maxSlices - 1);
    const tail = slices.slice(maxSlices - 1);
    grouped = [
      ...head,
      {
        key: OTHER_SLICE_KEY,
        categoryId: null,
        name: "Diğer",
        icon: "dots",
        color: NEUTRAL_COLOR,
        amountMinor: sumMinor(tail.map((slice) => slice.amountMinor)),
      },
    ];
  }

  const basisPoints = allocateBasisPoints(
    grouped.map((slice) => slice.amountMinor),
  );
  return grouped.map((slice, index) => ({
    ...slice,
    basisPoints: basisPoints[index] ?? 0,
  }));
}

// ─── Aylık toplamlar ───────────────────────────────────────────────────────

export type MonthKey = { year: number; /** 0-11 */ month: number };

export type MonthlyTotals = MonthKey & {
  key: string;
  /** "Eki" */
  label: string;
  incomeMinor: number;
  expenseMinor: number;
};

function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

/** Verilen tarihin ayı dahil, geriye doğru `count` ay (eskiden yeniye). */
export function monthsEnding(date: Date, count: number): MonthKey[] {
  const months: MonthKey[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const value = new Date(date.getFullYear(), date.getMonth() - offset, 1);
    months.push({ year: value.getFullYear(), month: value.getMonth() });
  }
  return months;
}

/** Ay aralığını kapsayan tarih aralığı: ilk ayın 1'i (dahil) → son aydan sonraki ayın 1'i (hariç). */
export function monthsToRange(months: readonly MonthKey[]): DateRange {
  const first = months[0];
  const last = months[months.length - 1];
  if (!first || !last) throw new RangeError("En az bir ay gerekli.");
  return {
    start: new Date(first.year, first.month, 1),
    end: new Date(last.year, last.month + 1, 1),
  };
}

export function monthlyTotals(
  transactions: readonly AggregatableTransaction[],
  months: readonly MonthKey[],
): MonthlyTotals[] {
  const buckets = new Map(
    months.map((month) => [
      `${month.year}-${month.month}`,
      {
        ...month,
        key: `${month.year}-${month.month}`,
        label: TR_MONTHS_SHORT[month.month] ?? "",
        incomeMinor: 0,
        expenseMinor: 0,
      },
    ]),
  );

  for (const transaction of transactions) {
    const bucket = buckets.get(monthKeyOf(new Date(transaction.date)));
    if (!bucket) continue;
    if (transaction.type === "income")
      bucket.incomeMinor = sumMinor([
        bucket.incomeMinor,
        transaction.amountMinor,
      ]);
    else
      bucket.expenseMinor = sumMinor([
        bucket.expenseMinor,
        transaction.amountMinor,
      ]);
  }

  return [...buckets.values()];
}

// ─── Net değişim trendi ────────────────────────────────────────────────────

export type TrendGranularity = "day" | "month";

export type TrendPoint = {
  key: string;
  /** Günlükte "29", aylıkta "Eki". */
  label: string;
  /** Kovanın başlangıcı (yerel). */
  start: Date;
  /** Bu kovadaki gelir − gider. */
  netMinor: number;
  /** Dönem başından bu kovanın sonuna kadar birikimli net değişim. */
  cumulativeMinor: number;
};

function dayKeyOf(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/**
 * Dönem başından itibaren birikimli net değişim (açılış bakiyesi bilinmediği için "bakiye" DEĞİL).
 * Bugünden sonraki kovalar üretilmez; dönem tamamen gelecekteyse boş döner.
 */
export function cumulativeNetTrend(
  transactions: readonly AggregatableTransaction[],
  range: DateRange,
  now: Date,
): { granularity: TrendGranularity; points: TrendPoint[] } {
  const granularity: TrendGranularity =
    daysInRange(range) <= DAILY_TREND_MAX_DAYS ? "day" : "month";
  const endOfToday = addLocalDays(startOfLocalDay(now), 1);
  const limit = range.end < endOfToday ? range.end : endOfToday;
  if (limit <= range.start) return { granularity, points: [] };

  const starts: Date[] = [];
  if (granularity === "day") {
    for (
      let day = startOfLocalDay(range.start);
      day < limit;
      day = addLocalDays(day, 1)
    )
      starts.push(day);
  } else {
    for (
      let month = new Date(
        range.start.getFullYear(),
        range.start.getMonth(),
        1,
      );
      month < limit;
      month = new Date(month.getFullYear(), month.getMonth() + 1, 1)
    ) {
      starts.push(month);
    }
  }

  const keyOf = granularity === "day" ? dayKeyOf : monthKeyOf;
  const netByKey = new Map<string, number>();
  for (const transaction of transactions) {
    const date = new Date(transaction.date);
    if (date < range.start || date >= limit) continue;
    const key = keyOf(date);
    const signed =
      transaction.type === "income"
        ? transaction.amountMinor
        : -transaction.amountMinor;
    netByKey.set(key, sumMinor([netByKey.get(key) ?? 0, signed]));
  }

  let cumulative = 0;
  const points = starts.map((start) => {
    const key = keyOf(start);
    const netMinor = netByKey.get(key) ?? 0;
    cumulative = sumMinor([cumulative, netMinor]);
    return {
      key,
      label:
        granularity === "day"
          ? String(start.getDate())
          : (TR_MONTHS_SHORT[start.getMonth()] ?? ""),
      start,
      netMinor,
      cumulativeMinor: cumulative,
    };
  });

  return { granularity, points };
}

/** Grafik ekseni için kısa tutar: 1234567 kuruş → "₺12,3B", −500000 → "−₺5B". */
export function formatCompactTry(minor: number): string {
  assertMinor(minor);
  const sign = minor < 0 ? MINUS_SIGN : "";
  const lira = Math.abs(minor) / 100;
  const format = (value: number, suffix: string) => {
    const rounded = Math.round(value * 10) / 10;
    const text = Number.isInteger(rounded)
      ? String(rounded)
      : rounded.toFixed(1).replace(".", ",");
    return `${sign}₺${text}${suffix}`;
  };
  if (lira >= 1_000_000_000) return format(lira / 1_000_000_000, "Mr");
  if (lira >= 1_000_000) return format(lira / 1_000_000, "Mn");
  if (lira >= 1_000) return format(lira / 1_000, "B");
  return format(lira, "");
}
